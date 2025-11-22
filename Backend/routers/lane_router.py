from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List
from services.lane_service import get_lane_service, LaneService
import logging
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
    # Attempt to read from persistence (DB or file) but be resilient to DB errors
    state = None
    try:
        # Try original ID first
        state = await lane_service.persistence.get_signal_state(intersectionId)

        # If not found, try normalized versions
        if not state:
            # Try adding hyphen: INT001 -> INT-001
            if '-' not in intersectionId and len(intersectionId) >= 3:
                normalized_id = f"{intersectionId[:3]}-{intersectionId[3:]}"
                state = await lane_service.persistence.get_signal_state(normalized_id)

            # Try removing hyphen: INT-001 -> INT001
            if not state and '-' in intersectionId:
                normalized_id = intersectionId.replace('-', '')
                state = await lane_service.persistence.get_signal_state(normalized_id)
    except Exception as e:
        logging.exception("Error reading signal state from persistence, falling back to in-memory state")

    # Build a merged response using persistence state (if any) and in-memory current_state for timings/details
    response = {}
    if state:
        # persistence state is expected to be a dict-like object from DB/file
        response.update({
            "intersectionId": state.get("intersectionId", intersectionId),
            "state": state.get("state", {}),
            "currentLane": state.get("currentLane"),
            "remainingTime": state.get("remainingTime"),
            "phase": state.get("phase"),
        })

    # Merge in-memory information (durations, priority_order, ages, counts, live remaining/phase if present)
    cs = lane_service.current_state or {}
    # current_state may store timings under different keys depending on where it was set
    # prefer live values from current_state when available
    response.setdefault("intersectionId", cs.get("intersectionId", intersectionId))
    response["state"] = cs.get("lights", response.get("state", {}))
    response["currentLane"] = cs.get("lane", response.get("currentLane"))
    response["remainingTime"] = cs.get("remaining", response.get("remainingTime", 0))
    response["phase"] = cs.get("phase", response.get("phase", "red"))
    # Add cycle metadata if present
    if cs.get("durations"):
        response["durations"] = cs.get("durations")
    if cs.get("priority_order"):
        response["priority_order"] = cs.get("priority_order")
    if cs.get("ages"):
        response["ages"] = cs.get("ages")
    if cs.get("counts"):
        response["counts"] = cs.get("counts")

    # If we don't have any useful data, return 404
    if not response.get("state") and not cs:
        raise HTTPException(
            status_code=404,
            detail=f"Signal state not found for intersection {intersectionId}."
        )

    return response

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
