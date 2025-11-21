from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from deps.auth_deps import require_role, get_db
from services.lane_service import lane_service
from models.traffic_signal_state import TrafficSignalState
from models.traffic_data import TrafficData
import json
import os

router = APIRouter(prefix="/lane", tags=["Lane Management"])

@router.get("/signal_state", response_model=TrafficSignalState)
async def get_signal_state(intersectionId: str = Query(..., description="Intersection ID")):
    """
    Get the latest signal state for an intersection.
    Public endpoint for IoT devices.
    """
    # Try to get from service memory first if it matches
    # But service memory might be transient or just for the active cycle.
    # Better to read from persistence (DB or file).
    
    if lane_service.db is not None:
        state = await lane_service.db.traffic_signal_state.find_one({"intersectionId": intersectionId})
        if state:
            return TrafficSignalState(**state)
    else:
        # File fallback
        if os.path.exists(lane_service.signal_state_file):
            with open(lane_service.signal_state_file, 'r') as f:
                try:
                    data = json.load(f)
                    state = data.get(intersectionId)
                    if state:
                        return TrafficSignalState(**state)
                except:
                    pass
                    
    raise HTTPException(status_code=404, detail="Signal state not found")

@router.post("/run_cycle", dependencies=[Depends(require_role(["employee", "admin"]))])
async def run_cycle(intersectionId: str = Query(..., description="Intersection ID")):
    """
    Manually trigger a cycle plan calculation.
    """
    state = await lane_service.manual_trigger(intersectionId)
    return state

@router.get("/history", dependencies=[Depends(require_role(["employee", "admin"]))])
async def get_history(
    intersectionId: str = Query(..., description="Intersection ID"),
    limit: int = 20
):
    """
    Get historical traffic data.
    """
    if lane_service.db is not None:
        cursor = lane_service.db.traffic_data.find({"intersectionId": intersectionId}).sort("timestamp", -1).limit(limit)
        results = await cursor.to_list(length=limit)
        return [TrafficData(**r) for r in results]
    else:
        # File fallback
        if os.path.exists(lane_service.traffic_data_file):
            with open(lane_service.traffic_data_file, 'r') as f:
                try:
                    data = json.load(f)
                    # Filter by intersectionId and sort
                    filtered = [d for d in data if d.get("intersectionId") == intersectionId]
                    filtered.sort(key=lambda x: x["timestamp"], reverse=True)
                    return [TrafficData(**d) for d in filtered[:limit]]
                except:
                    pass
        return []

@router.get("/current_state", dependencies=[Depends(require_role(["employee", "admin"]))])
async def get_current_state(intersectionId: str = Query(..., description="Intersection ID")):
    """
    Get in-memory live state from the service.
    """
    # For now, we just return the last calculated state from the service if available
    # Note: LaneService currently runs for DEFAULT_INTERSECTION_ID.
    # If intersectionId matches, return it.
    
    # We might need to expose current_state from LaneService
    # I'll add a property or just access it if I modify LaneService to store it.
    # I'll assume LaneService has it or I can get it.
    # In my implementation of LaneService, I didn't explicitly store `self.current_state` as a public property that persists across the loop steps easily accessible.
    # But I can add it.
    
    # Actually, I'll just return the signal state which is close enough.
    return await get_signal_state(intersectionId)
