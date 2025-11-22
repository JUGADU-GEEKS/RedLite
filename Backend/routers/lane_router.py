from fastapi import APIRouter, Depends, HTTPException, Query, Path
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

@router.get("/signal_status/{intersectionId}")
async def get_signal_status(
    intersectionId: str = Path(..., description="Intersection ID (e.g., INT-001 or INT001)"),
    lane_service: LaneService = Depends(get_lane_service)
):
    """
    Get the current signal status for a specific intersection.
    
    Returns the current traffic light state including:
    - Light states for all lanes (red/yellow/green)
    - Current active lane
    - Remaining time
    - Current phase (green/yellow)
    
    Tries multiple ID formats if exact match not found:
    - Original ID
    - With hyphen (INT001 -> INT-001)
    - Without hyphen (INT-001 -> INT001)
    """
    # Try original ID first
    state = await lane_service.persistence.get_signal_state(intersectionId)
    
    # If not found, try normalized versions
    if not state:
        # Try adding hyphen: INT001 -> INT-001
        if not '-' in intersectionId and len(intersectionId) >= 3:
            normalized_id = f"{intersectionId[:3]}-{intersectionId[3:]}"
            state = await lane_service.persistence.get_signal_state(normalized_id)
        
        # Try removing hyphen: INT-001 -> INT001
        if not state and '-' in intersectionId:
            normalized_id = intersectionId.replace('-', '')
            state = await lane_service.persistence.get_signal_state(normalized_id)
    
    # If still not found, return current state from lane service if it matches
    if not state and lane_service.current_state:
        current_intersection_id = lane_service.current_state.get("intersectionId")
        if current_intersection_id == intersectionId or \
           current_intersection_id == intersectionId.replace('-', '') or \
           current_intersection_id == f"{intersectionId[:3]}-{intersectionId[3:]}" if len(intersectionId) >= 3 else None:
            # Return a constructed state from current_state
            return {
                "intersectionId": intersectionId,
                "state": lane_service.current_state.get("lights", {}),
                "currentLane": lane_service.current_state.get("lane"),
                "remainingTime": lane_service.current_state.get("remaining", 0),
                "phase": lane_service.current_state.get("phase", "red")
            }
    
    if not state:
        raise HTTPException(
            status_code=404, 
            detail=f"Signal state not found for intersection {intersectionId}. Available intersections may use different ID formats."
        )
    return state

@router.post("/lane/run_cycle")
async def run_cycle(
    user: User = Depends(require_role(["employee", "admin"])),
    lane_service: LaneService = Depends(get_lane_service),
    requested_lane: str = Query(None)
):
    """Trigger a manual cycle recalculation. If requested_lane provided and age > 60, use age-based priority."""
    state = await lane_service.manual_trigger(DEFAULT_INTERSECTION_ID, requested_lane)
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
