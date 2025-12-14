import asyncio
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

from core.config import DEFAULT_INTERSECTION_ID, LANES, YELLOW_TIME
from models.traffic_data import TrafficData
from models.traffic_signal_state import TrafficSignalState
from utils.yolo_detector import VideoYOLODetector
from utils.prr_masc import prr_cycle_fixed
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import json
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PersistenceManager:
    def __init__(self, mongo_url: str):
        self.use_mongo = bool(mongo_url)
        if self.use_mongo:
            # Use certifi CA bundle so TLS certificate verification succeeds (helps on macOS)
            self.client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
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
        self._by_intersection: Dict[str, List[WebSocket]] = {}
        self._conn_to_intersection: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, intersection_id: str):
        await websocket.accept()
        self._by_intersection.setdefault(intersection_id, []).append(websocket)
        self._conn_to_intersection[websocket] = intersection_id

    def disconnect(self, websocket: WebSocket) -> Optional[str]:
        iid = self._conn_to_intersection.pop(websocket, None)
        if iid and iid in self._by_intersection:
            try:
                self._by_intersection[iid].remove(websocket)
            except ValueError:
                pass
            if not self._by_intersection[iid]:
                del self._by_intersection[iid]
        return iid

    def has_subscribers(self, intersection_id: str) -> bool:
        return bool(self._by_intersection.get(intersection_id))

    async def broadcast(self, payload: dict, intersection_id: str):
        conns = list(self._by_intersection.get(intersection_id, []))
        for connection in conns:
            try:
                await connection.send_json(payload)
            except Exception:
                # Best-effort; drop bad connections silently
                try:
                    self.disconnect(connection)
                except Exception:
                    pass


from services import emergency_service

class LaneService:
    def __init__(self, mongo_url: str):
        self._detectors: Dict[str, VideoYOLODetector] = {}
        self.ages = {lane: 0 for lane in LANES}
        self.persistence = PersistenceManager(mongo_url)
        self.ws_manager = WebSocketManager()
        self.stop_event = asyncio.Event()
        self.current_state_by_intersection: Dict[str, dict] = {}
        self._tasks: Dict[str, asyncio.Task] = {}

    def _get_detector(self, intersection_id: str) -> VideoYOLODetector:
        det = self._detectors.get(intersection_id)
        if det is None:
            det = VideoYOLODetector(intersection_id)
            self._detectors[intersection_id] = det
        return det

    async def ensure_loop(self, intersection_id: str):
        if intersection_id in self._tasks and not self._tasks[intersection_id].done():
            return
        self._tasks[intersection_id] = asyncio.create_task(self._run_loop_for(intersection_id))

    def maybe_stop_loop(self, intersection_id: str):
        if not self.ws_manager.has_subscribers(intersection_id):
            task = self._tasks.pop(intersection_id, None)
            if task and not task.done():
                task.cancel()
            det = self._detectors.pop(intersection_id, None)
            if det:
                det.release()

    async def run_cycle_plan(self, intersectionId: str):
        detector = self._get_detector(intersectionId)
        counts, frames = detector.get_cycle_snapshot()
        ages_snapshot = self.ages.copy()
        
        state = prr_cycle_fixed(counts, ages_snapshot)
        
        traffic_data = TrafficData(
            intersectionId=intersectionId,
            lane_counts=counts,
            source="yolo" if (getattr(detector, "model", None)) else "fallback",
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
        
        self.current_state_by_intersection[intersectionId] = {
            "counts": counts,
            "frames": frames,
            **state
        }
        return self.current_state_by_intersection[intersectionId]

    async def _run_loop_for(self, intersection_id: str):
        while not self.stop_event.is_set():
            try:
                cycle_plan = await self.run_cycle_plan(intersection_id)
                priority_order = cycle_plan["priority_order"]
                durations = cycle_plan["durations"]
                counts_snapshot = cycle_plan["counts"]
                ages_snapshot = self.ages.copy()

                logger.info(f"[CYCLE START {intersection_id}] Priority: {priority_order}, Durations: {durations}")

                for lane in priority_order:
                    green_duration = durations[lane]
                    for remaining in range(green_duration, 0, -1):
                        # --- EMERGENCY OVERRIDE CHECK ---
                        active_override = None
                        # Check known intersection IDs (or ideally use DEFAULT_INTERSECTION_ID if it matches)
                        # Assuming DEFAULT_INTERSECTION_ID is what we are controlling
                        override = emergency_service.get_active_override(intersection_id)
                        if not override:
                             # Fallback check for demo IDs if DEFAULT_INTERSECTION_ID is generic
                             for i_id in ["INT-01", "INT-02", "INT-03"]:
                                 ov = emergency_service.get_active_override(i_id)
                                 if ov and ov['active']:
                                     override = ov
                                     break
                        
                        if override and override['active']:
                            override_direction = override['direction'].lower()
                            logger.info(f"[AMBULANCE] OVERRIDE ACTIVE in LaneService: {override_direction} GREEN")
                            
                            # Force override state
                            current_frames = {}
                            for l in LANES:
                                frame = self._get_detector(intersection_id).read_frame(l)
                                current_frames[l] = frame if frame else ""
                            
                            light_state = {l: "green" if l == override_direction else "red" for l in LANES}
                            
                            payload = {
                                "phase": "green",
                                "lane": override_direction,
                                "remaining": 99, # Indefinite
                                "counts": counts_snapshot,
                                "frames": current_frames,
                                "priority_order": priority_order,
                                "durations": durations,
                                "ages": ages_snapshot,
                                "lights": light_state,
                                "override_active": True,
                                "override_direction": override_direction
                            }
                            await self.ws_manager.broadcast(payload, intersection_id)
                            await asyncio.sleep(0.5)
                            continue # Skip normal logic and stay in this loop iteration (effectively pausing the countdown)
                            # Actually, 'continue' here just goes to next iteration of 'remaining' loop
                            # But we want to PAUSE the countdown.
                            # So we should probably stay in a while loop here until override clears.
                            
                            while True:
                                # Re-check override
                                override = emergency_service.get_active_override(intersection_id)
                                if not override:
                                     for i_id in ["INT-01", "INT-02", "INT-03"]:
                                         ov = emergency_service.get_active_override(i_id)
                                         if ov and ov['active']:
                                             override = ov
                                             break
                                
                                if not override or not override['active']:
                                    logger.info("[AMBULANCE] Override cleared, resuming cycle.")
                                    break
                                
                                # Still active
                                override_direction = override['direction'].lower()
                                current_frames = {}
                                for l in LANES:
                                    frame = self._get_detector(intersection_id).read_frame(l)
                                    current_frames[l] = frame if frame else ""
                                
                                light_state = {l: "green" if l == override_direction else "red" for l in LANES}
                                payload = {
                                    "phase": "green",
                                    "lane": override_direction,
                                    "remaining": 99,
                                    "counts": counts_snapshot,
                                    "frames": current_frames,
                                    "priority_order": priority_order,
                                    "durations": durations,
                                    "ages": ages_snapshot,
                                    "lights": light_state,
                                    "override_active": True,
                                    "override_direction": override_direction
                                }
                                await self.ws_manager.broadcast(payload, intersection_id)
                                await asyncio.sleep(0.5)
                            
                            # When loop breaks, we resume. 
                            # We might want to restart the current phase or just continue.
                            # Let's continue decrementing 'remaining' from where we left off.
                        
                        # --- END EMERGENCY OVERRIDE CHECK ---

                        # Continuously read frames for all lanes during green
                        current_frames = {}
                        for l in LANES:
                            frame = self._get_detector(intersection_id).read_frame(l)
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
                        await self.ws_manager.broadcast(payload, intersection_id)
                        
                        signal_state = TrafficSignalState(
                            intersectionId=intersection_id,
                            state=light_state,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="green"
                        )
                        await self.persistence.upsert_signal_state(signal_state)
                        cs = self.current_state_by_intersection.setdefault(intersection_id, {})
                        cs.update(payload)
                        await asyncio.sleep(1)

                    # YELLOW PHASE - Fixed 3 seconds
                    for remaining in range(YELLOW_TIME, 0, -1):
                        # Continuously read frames for all lanes during yellow
                        current_frames = {}
                        for l in LANES:
                            frame = self._get_detector(intersection_id).read_frame(l)
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
                        await self.ws_manager.broadcast(payload, intersection_id)

                        signal_state = TrafficSignalState(
                            intersectionId=intersection_id,
                            state=light_state,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="yellow"
                        )
                        await self.persistence.upsert_signal_state(signal_state)
                        cs = self.current_state_by_intersection.setdefault(intersection_id, {})
                        cs.update(payload)
                        await asyncio.sleep(1)

                    # Set lane to RED before moving to next lane
                    # Read frames for all lanes
                    current_frames = {}
                    for l in LANES:
                        frame = self._get_detector(intersection_id).read_frame(l)
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
                    await self.ws_manager.broadcast(payload, intersection_id)

                # STEP 3: After ALL 4 lanes complete, reset ages and prepare for next cycle
                # Reset ALL ages to 0 (all lanes were served in round-robin)
                for lane in LANES:
                    self.ages[lane] = 0
                
                logger.info(f"[CYCLE COMPLETE {intersection_id}] Ages reset. Next cycle will recalc priority.")

            except asyncio.CancelledError:
                logger.info("Background loop cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in background loop: {e}", exc_info=True)
                await asyncio.sleep(5) # Wait before retrying

    async def background_loop(self):
        # Keep service alive; start default loop lazily for default intersection
        await self.ensure_loop(DEFAULT_INTERSECTION_ID)
        while not self.stop_event.is_set():
            await asyncio.sleep(1)

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
        for det in self._detectors.values():
            det.release()
        self.stop_event.set()
        logger.info("LaneService released resources.")

_lane_service_instance = None

def get_lane_service(mongo_url: str = None) -> LaneService:
    global _lane_service_instance
    if _lane_service_instance is None:
        from core.config import MONGO_URL
        _lane_service_instance = LaneService(mongo_url or MONGO_URL)
    return _lane_service_instance
