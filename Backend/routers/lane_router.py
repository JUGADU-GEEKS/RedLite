from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from services.lane_service import get_lane_service, LaneService
from deps.auth_deps import require_role
from models.user import User
from core.config import DEFAULT_INTERSECTION_ID

router = APIRouter()

@router.get("/lane/signal_state")
async def get_signal_state(
    intersectionId: str = Query(DEFAULT_INTERSECTION_ID),
    lane_service: LaneService = Depends(get_lane_service)
):
    state = await lane_service.persistence.get_signal_state(intersectionId)
    if not state:
        raise HTTPException(status_code=404, detail="Signal state not found")
    return state

@router.post("/lane/run_cycle")
async def run_cycle(
    user: User = Depends(require_role(["employee", "admin"])),
    lane_service: LaneService = Depends(get_lane_service)
):
    state = await lane_service.manual_trigger(DEFAULT_INTERSECTION_ID)
    return state

@router.get("/lane/history")
async def get_history(
    intersectionId: str = Query(DEFAULT_INTERSECTION_ID),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(require_role(["employee", "admin"])),
    lane_service: LaneService = Depends(get_lane_service)
):
    # In a real application, you'd check if the user is assigned to this intersection
    # if user.role != "admin" and intersectionId not in user.assigned_intersections:
    #     raise HTTPException(status_code=403, detail="Not authorized for this intersection")
    history = await lane_service.persistence.get_traffic_history(intersectionId, limit)
    return history

@router.get("/lane/current_state")
async def get_current_state(
    intersectionId: str = Query(DEFAULT_INTERSECTION_ID),
    user: User = Depends(require_role(["employee", "admin"])),
    lane_service: LaneService = Depends(get_lane_service)
):
    if lane_service.current_state.get("intersectionId") == intersectionId:
        return lane_service.current_state
    return {}
