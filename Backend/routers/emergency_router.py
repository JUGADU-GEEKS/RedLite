from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from deps.auth_deps import get_current_user, require_role
from services import emergency_service, intersection_service

router = APIRouter(prefix="/emergency", tags=["emergency"])

def require_ambulance_auth(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ambulance_driver":
        raise HTTPException(status_code=403, detail="Access denied: Ambulance drivers only")
    
    info = current_user.get("ambulanceInfo")
    if not info or not info.get("authorized"):
        raise HTTPException(status_code=403, detail="Access denied: Ambulance not authorized")
    return current_user

@router.post("/start")
def start_emergency(
    data: dict = Body(...),
    current_user: dict = Depends(require_ambulance_auth)
):
    """
    Start an emergency override request.
    Expected data: { lat, lon, heading, speed, vehicleId }
    """
    try:
        result = emergency_service.request_override(
            user_id=current_user["userId"],
            vehicle_id=data.get("vehicleId", "UNKNOWN"),
            lat=float(data["lat"]),
            lon=float(data["lon"]),
            heading=float(data["heading"]),
            speed=float(data.get("speed", 0))
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid data format")

@router.post("/heartbeat")
def heartbeat(
    data: dict = Body(...),
    current_user: dict = Depends(require_ambulance_auth)
):
    """
    Update position and maintain lock.
    Expected data: { lat, lon, heading, speed }
    """
    try:
        result = emergency_service.process_heartbeat(
            user_id=current_user["userId"],
            lat=float(data["lat"]),
            lon=float(data["lon"]),
            heading=float(data["heading"]),
            speed=float(data.get("speed", 0))
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {str(e)}")

@router.post("/stop")
def stop_emergency(
    current_user: dict = Depends(require_ambulance_auth)
):
    """
    Manually stop the emergency override.
    """
    success = emergency_service.stop_override(current_user["userId"])
    return {"status": "stopped", "success": success}

@router.get("/intersections")
def list_intersections(
    current_user: dict = Depends(require_ambulance_auth)
):
    """
    Read-only list of intersections for the ambulance dashboard.
    """
    return intersection_service.get_all_intersections(limit=1000)
