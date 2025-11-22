import asyncio
import logging
from typing import Dict, List
from fastapi import WebSocket

from core.config import DEFAULT_INTERSECTION_ID, LANES, YELLOW_TIME
from models.traffic_data import TrafficData
from models.traffic_signal_state import TrafficSignalState
from utils.yolo_detector import VideoYOLODetector
from utils.prr_masc import prr_cycle_fixed
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PersistenceManager:
    def __init__(self, mongo_url: str):
        self.use_mongo = bool(mongo_url)
        if self.use_mongo:
            self.client = AsyncIOMotorClient(mongo_url)
            self.db = self.client.lanezy
            self.traffic_data_collection = self.db.traffic_data
            self.traffic_signal_state_collection = self.db.traffic_signal_state
            logger.info("MongoDB connection established.")
        else:
            self.data_dir = "Backend/data"
            os.makedirs(self.data_dir, exist_ok=True)
            self.traffic_data_file = os.path.join(self.data_dir, "traffic_data.json")
            self.traffic_signal_state_file = os.path.join(self.data_dir, "traffic_signal_state.json")
            logger.info("Using file-based persistence.")

    async def save_traffic_data(self, data: TrafficData):
        if self.use_mongo:
            await self.traffic_data_collection.insert_one(data.dict(by_alias=True, exclude_none=True))
        else:
            with open(self.traffic_data_file, "a") as f:
                f.write(data.json() + "\n")

    async def upsert_signal_state(self, state: TrafficSignalState):
        if self.use_mongo:
            await self.traffic_signal_state_collection.update_one(
                {"intersectionId": state.intersectionId},
                {"$set": state.dict(by_alias=True, exclude_none=True)},
                upsert=True
            )
        else:
            # For file-based, we overwrite the file with the latest state
            with open(self.traffic_signal_state_file, "w") as f:
                f.write(state.json())

    async def get_signal_state(self, intersection_id: str) -> dict:
        if self.use_mongo:
            state = await self.traffic_signal_state_collection.find_one({"intersectionId": intersection_id})
            return state
        else:
            if os.path.exists(self.traffic_signal_state_file):
                with open(self.traffic_signal_state_file, "r") as f:
                    return json.load(f)
            return None

    async def get_traffic_history(self, intersection_id: str, limit: int) -> list:
        if self.use_mongo:
            cursor = self.traffic_data_collection.find({"intersectionId": intersection_id}).sort("timestamp", -1).limit(limit)
            return await cursor.to_list(length=limit)
        else:
            if os.path.exists(self.traffic_data_file):
                with open(self.traffic_data_file, "r") as f:
                    lines = f.readlines()
                    # Get the last `limit` lines and parse them
                    return [json.loads(line) for line in lines[-limit:]]
            return []


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, payload: dict):
        for connection in self.active_connections:
            await connection.send_json(payload)


class LaneService:
    def __init__(self, mongo_url: str):
        self.detector = VideoYOLODetector(DEFAULT_INTERSECTION_ID)
        self.ages = {lane: 0 for lane in LANES}
        self.persistence = PersistenceManager(mongo_url)
        self.ws_manager = WebSocketManager()
        self.stop_event = asyncio.Event()
        self.current_state = {}

    async def run_cycle_plan(self, intersectionId: str):
        counts, frames = self.detector.get_cycle_snapshot()
        ages_snapshot = self.ages.copy()
        
        state = prr_cycle_fixed(counts, ages_snapshot)
        
        traffic_data = TrafficData(
            intersectionId=intersectionId,
            lane_counts=counts,
            source="yolo" if self.detector.model else "fallback",
            priority_order=state["priority_order"],
            durations=state["durations"],
            ages=ages_snapshot,
        )
        await self.persistence.save_traffic_data(traffic_data)
        
        initial_signal_state = TrafficSignalState(
            intersectionId=intersectionId,
            state={lane: "red" for lane in LANES},
            currentLane=None,
            remainingTime=0,
            phase=None
        )
        await self.persistence.upsert_signal_state(initial_signal_state)
        
        self.current_state = {
            "counts": counts,
            "frames": frames,
            **state
        }
        return self.current_state

    async def background_loop(self):
        """
        Main cycle loop implementing PRR-MASC fixed cycle logic:
        - Priority computed ONCE per full cycle (all 4 lanes)
        - Fixed timings: Rank 1=45s, Rank 2=30s, Rank 3=15s, Rank 4=15s, Yellow=3s
        - Density snapshot captured once at start, used for entire cycle
        - Ages reset to 0 for ALL lanes after each full cycle completes
        """
        while not self.stop_event.is_set():
            try:
                # STEP 1: Compute priority ONCE at cycle start
                # Capture density snapshot and current ages
                cycle_plan = await self.run_cycle_plan(DEFAULT_INTERSECTION_ID)
                priority_order = cycle_plan["priority_order"]
                durations = cycle_plan["durations"]
                counts_snapshot = cycle_plan["counts"]  # Frozen snapshot for entire cycle
                ages_snapshot = self.ages.copy()  # Snapshot at cycle start
                frames_snapshot = cycle_plan["frames"]  # Initial frames

                logger.info(f"[CYCLE START] Priority order: {priority_order}, Durations: {durations}, Ages: {ages_snapshot}")

                # STEP 2: Serve each lane in priority order (FIXED CYCLE)
                for lane in priority_order:
                    green_duration = durations[lane]
                    
                    # GREEN PHASE - Fixed duration based on rank
                    for remaining in range(green_duration, 0, -1):
                        # Continuously read frames for all lanes during green
                        current_frames = {}
                        for l in LANES:
                            frame = self.detector.read_frame(l)
                            current_frames[l] = frame if frame else ""  # Ensure all lanes have entries
                        
                        light_state = {l: "red" for l in LANES}
                        light_state[lane] = "green"

                        payload = {
                            "phase": "green",
                            "lane": lane,
                            "remaining": remaining,
                            "counts": counts_snapshot,  # Use frozen snapshot
                            "frames": current_frames,  # Live frame updates for all lanes
                            "priority_order": priority_order,
                            "durations": durations,
                            "ages": ages_snapshot,  # Use frozen snapshot
                            "lights": light_state
                        }
                        await self.ws_manager.broadcast(payload)
                        
                        signal_state = TrafficSignalState(
                            intersectionId=DEFAULT_INTERSECTION_ID,
                            state=light_state,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="green"
                        )
                        await self.persistence.upsert_signal_state(signal_state)
                        self.current_state.update(payload)
                        await asyncio.sleep(1)

                    # YELLOW PHASE - Fixed 3 seconds
                    for remaining in range(YELLOW_TIME, 0, -1):
                        # Continuously read frames for all lanes during yellow
                        current_frames = {}
                        for l in LANES:
                            frame = self.detector.read_frame(l)
                            current_frames[l] = frame if frame else ""  # Ensure all lanes have entries
                        
                        light_state = {l: "red" for l in LANES}
                        light_state[lane] = "yellow"

                        payload = {
                            "phase": "yellow",
                            "lane": lane,
                            "remaining": remaining,
                            "counts": counts_snapshot,  # Use frozen snapshot
                            "frames": current_frames,  # Live frame updates for all lanes
                            "priority_order": priority_order,
                            "durations": durations,
                            "ages": ages_snapshot,  # Use frozen snapshot
                            "lights": light_state
                        }
                        await self.ws_manager.broadcast(payload)

                        signal_state = TrafficSignalState(
                            intersectionId=DEFAULT_INTERSECTION_ID,
                            state=light_state,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="yellow"
                        )
                        await self.persistence.upsert_signal_state(signal_state)
                        self.current_state.update(payload)
                        await asyncio.sleep(1)

                    # Set lane to RED before moving to next lane
                    # Read frames for all lanes
                    current_frames = {}
                    for l in LANES:
                        frame = self.detector.read_frame(l)
                        current_frames[l] = frame if frame else ""  # Ensure all lanes have entries
                    
                    light_state = {l: "red" for l in LANES}
                    payload = {
                        "phase": "red",
                        "lane": lane,
                        "remaining": 0,
                        "counts": counts_snapshot,
                        "frames": current_frames,
                        "priority_order": priority_order,
                        "durations": durations,
                        "ages": ages_snapshot,
                        "lights": light_state
                    }
                    await self.ws_manager.broadcast(payload)

                # STEP 3: After ALL 4 lanes complete, reset ages and prepare for next cycle
                # Reset ALL ages to 0 (all lanes were served in round-robin)
                for lane in LANES:
                    self.ages[lane] = 0
                
                logger.info(f"[CYCLE COMPLETE] All lanes served. Ages reset. Next cycle will recalculate priority.")

            except asyncio.CancelledError:
                logger.info("Background loop cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in background loop: {e}", exc_info=True)
                await asyncio.sleep(5) # Wait before retrying

    async def manual_trigger(self, intersectionId: str, requested_lane: str = None):
        """
        Manual trigger to recalculate cycle plan.
        If requested_lane is provided and any lane has age > 60, 
        recalculate priority based on age.
        """
        if requested_lane:
            # Check if any lane has age > 60
            max_age = max(self.ages.values()) if self.ages else 0
            if max_age > 60:
                logger.info(f"[MANUAL] Age > 60 detected (max: {max_age}), recalculating priority based on age")
                # Recalculate with current ages (will use age-based priority)
                return await self.run_cycle_plan(intersectionId)
            else:
                logger.info(f"[MANUAL] Age <= 60, recalculating priority based on density")
                # Recalculate with current state
                return await self.run_cycle_plan(intersectionId)
        else:
            return await self.run_cycle_plan(intersectionId)

    def release(self):
        self.detector.release()
        self.stop_event.set()
        logger.info("LaneService released resources.")

_lane_service_instance = None

def get_lane_service(mongo_url: str = None) -> LaneService:
    global _lane_service_instance
    if _lane_service_instance is None:
        from core.config import MONGO_URL
        _lane_service_instance = LaneService(mongo_url or MONGO_URL)
    return _lane_service_instance
