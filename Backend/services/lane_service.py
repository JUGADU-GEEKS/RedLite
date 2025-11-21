import asyncio
import json
import logging
import os
import time
from typing import Dict, List, Optional
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import WebSocket, WebSocketDisconnect

from core.config import MONGO_URL, DEFAULT_INTERSECTION_ID, LANES, YELLOW_TIME
from models.traffic_data import TrafficData
from models.traffic_signal_state import TrafficSignalState
from utils.yolo_detector import VideoYOLODetector
from utils.prr_masc import prr_cycle_fixed

logger = logging.getLogger(__name__)

class LaneService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LaneService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.detector = VideoYOLODetector()
        self.ages: Dict[str, int] = {lane: 0 for lane in LANES}
        self.active_connections: List[WebSocket] = []
        self.stop_event = asyncio.Event()
        self.current_state: Optional[Dict] = None
        
        # Persistence
        self.mongo_client = None
        self.db = None
        if MONGO_URL:
            try:
                self.mongo_client = AsyncIOMotorClient(MONGO_URL)
                self.db = self.mongo_client.get_database() # uses default db from uri
                logger.info("Connected to MongoDB for LaneService")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
        
        # File fallback paths
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        os.makedirs(self.data_dir, exist_ok=True)
        self.traffic_data_file = os.path.join(self.data_dir, 'traffic_data.json')
        self.signal_state_file = os.path.join(self.data_dir, 'traffic_signal_state.json')

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected")

    def disconnect_ws(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected")

    async def broadcast_ws(self, payload: Dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.warning(f"Failed to send to WS client: {e}")
                # Could remove connection here, but disconnect_ws handles it usually

    async def persist_traffic_data(self, data: TrafficData):
        data_dict = data.model_dump(by_alias=True)
        if self.db is not None:
            try:
                await self.db.traffic_data.insert_one(data_dict)
            except Exception as e:
                logger.error(f"Mongo insert error: {e}")
        else:
            # File fallback (append)
            try:
                existing = []
                if os.path.exists(self.traffic_data_file):
                    with open(self.traffic_data_file, 'r') as f:
                        try:
                            existing = json.load(f)
                        except json.JSONDecodeError:
                            pass
                existing.append(json.loads(data.model_dump_json())) # Use json dump to handle datetime
                # Keep last 1000 to avoid huge file
                if len(existing) > 1000:
                    existing = existing[-1000:]
                with open(self.traffic_data_file, 'w') as f:
                    json.dump(existing, f, indent=2)
            except Exception as e:
                logger.error(f"File persistence error: {e}")

    async def upsert_signal_state(self, state: TrafficSignalState):
        state_dict = state.model_dump(by_alias=True)
        if self.db is not None:
            try:
                await self.db.traffic_signal_state.update_one(
                    {"intersectionId": state.intersectionId},
                    {"$set": state_dict},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Mongo upsert error: {e}")
        else:
            # File fallback (single object per intersection)
            try:
                all_states = {}
                if os.path.exists(self.signal_state_file):
                    with open(self.signal_state_file, 'r') as f:
                        try:
                            all_states = json.load(f)
                        except json.JSONDecodeError:
                            pass
                all_states[state.intersectionId] = json.loads(state.model_dump_json())
                with open(self.signal_state_file, 'w') as f:
                    json.dump(all_states, f, indent=2)
            except Exception as e:
                logger.error(f"File persistence error: {e}")

    async def run_cycle_plan(self, intersection_id: str = DEFAULT_INTERSECTION_ID):
        logger.info(f"Starting cycle for {intersection_id}")
        
        # 1. Snapshot
        counts, frames = self.detector.get_cycle_snapshot()
        ages_snapshot = self.ages.copy()
        
        # 2. PRR Logic
        state = prr_cycle_fixed(counts, ages_snapshot, intersection_id)
        priority_order = state["priority_order"]
        durations = state["durations"]
        
        logger.info(f"Cycle plan: {priority_order} with durations {durations}")
        
        # 3. Persist TrafficData
        traffic_data = TrafficData(
            intersectionId=intersection_id,
            timestamp=state["timestamp"],
            lane_counts=counts,
            densityScore=sum(counts.values()), # Simple sum for now
            priority_order=priority_order,
            durations=durations,
            ages=ages_snapshot,
            frames_meta={k: "base64_data" for k in frames} # Don't store full b64 in DB if not needed, or store it? User said "Persists each cycle... with metadata". I'll skip huge b64 in DB for now to save space, or maybe store it. User didn't explicitly say store frames in DB, just "frames info".
        )
        await self.persist_traffic_data(traffic_data)
        
        return state, counts, frames

    async def background_loop(self):
        logger.info("LaneService background loop started")
        intersection_id = DEFAULT_INTERSECTION_ID
        
        while not self.stop_event.is_set():
            try:
                # Run Cycle
                state, counts_snapshot, frames_snapshot = await self.run_cycle_plan(intersection_id)
                priority_order = state["priority_order"]
                durations = state["durations"]
                
                # Execute Cycle
                for lane in priority_order:
                    if self.stop_event.is_set():
                        break
                        
                    duration = durations[lane]
                    logger.info(f"Serving {lane} for {duration}s")
                    
                    # GREEN Phase
                    for remaining in range(duration, 0, -1):
                        if self.stop_event.is_set():
                            break
                        
                        # Per-second update
                        current_frame = self.detector.read_frame(lane)
                        
                        # Construct signal state
                        lights = {l: "red" for l in LANES}
                        lights[lane] = "green"
                        
                        signal_state = TrafficSignalState(
                            intersectionId=intersection_id,
                            timestamp=time.time(),
                            state=lights,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="green"
                        )
                        await self.upsert_signal_state(signal_state)
                        
                        # Broadcast
                        payload = {
                            "phase": "green",
                            "lane": lane,
                            "remaining": remaining,
                            "counts": counts_snapshot,
                            "frames": {lane: current_frame}, # Send current frame for active lane
                            "priority_order": priority_order,
                            "durations": durations,
                            "ages": state["ages_snapshot"],
                            "lights": lights
                        }
                        await self.broadcast_ws(payload)
                        
                        await asyncio.sleep(1)
                        
                    # YELLOW Phase
                    logger.info(f"Switching {lane} to yellow")
                    for remaining in range(YELLOW_TIME, 0, -1):
                        if self.stop_event.is_set():
                            break
                            
                        lights = {l: "red" for l in LANES}
                        lights[lane] = "yellow"
                        
                        signal_state = TrafficSignalState(
                            intersectionId=intersection_id,
                            timestamp=time.time(),
                            state=lights,
                            currentLane=lane,
                            remainingTime=remaining,
                            phase="yellow"
                        )
                        await self.upsert_signal_state(signal_state)
                        
                        payload = {
                            "phase": "yellow",
                            "lane": lane,
                            "remaining": remaining,
                            "counts": counts_snapshot,
                            "frames": {lane: self.detector.read_frame(lane)},
                            "priority_order": priority_order,
                            "durations": durations,
                            "ages": state["ages_snapshot"],
                            "lights": lights
                        }
                        await self.broadcast_ws(payload)
                        
                        await asyncio.sleep(1)
                    
                    # Reset age after service
                    self.ages[lane] = 0
                
                # End of cycle
                # Optional: Increment ages for lanes that weren't served (none in this logic)
                
            except Exception as e:
                logger.error(f"Error in background loop: {e}")
                await asyncio.sleep(5) # Wait before retrying

    async def manual_trigger(self, intersection_id: str):
        # This is tricky because the background loop is running.
        # If we want to force a new cycle, we might need to interrupt the current one or just wait.
        # For now, I'll just return the plan that WOULD be executed, without interrupting the loop.
        # Or, if the user wants to CONTROL the lights, that's different.
        # The requirement says: "manual_trigger(intersectionId) -> call run_cycle_plan() just once (for POST /lane/run_cycle)"
        # This implies getting the state.
        state, counts, frames = await self.run_cycle_plan(intersection_id)
        return state

    def release(self):
        self.stop_event.set()
        self.detector.release()
        if self.mongo_client:
            self.mongo_client.close()
        logger.info("LaneService released")

lane_service = LaneService()
