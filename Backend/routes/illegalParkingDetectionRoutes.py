"""
Routes for controlling illegal parking detection service
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from typing import Dict, Optional
import cv2
from services.illegalParkingDetectionService import get_detection_service
from deps.auth_deps import get_current_user

router = APIRouter(prefix="/api/illegal-parking", tags=["illegal-parking-detection"])

class CameraConfig(BaseModel):
    camera_id: str
    video_path: str

class StartDetectionRequest(BaseModel):
    cameras: Dict[str, str]  # {camera_id: video_path}
    check_interval: float = 2.0  # seconds between checks

@router.post("/start-detection")
async def start_detection(
    request: StartDetectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start continuous illegal parking detection for specified cameras"""
    if current_user.get("role") not in ["admin", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and employee roles can start detection"
        )
    
    try:
        service = get_detection_service()
        
        # If service is already running, add new cameras or update existing ones
        if service.running:
            # Add new cameras to existing monitoring using the same path resolution logic
            new_cameras = {k: v for k, v in request.cameras.items() if k not in service.video_captures}
            if new_cameras:
                service.load_camera_videos(new_cameras)
        else:
            # Load camera videos and start fresh
            service.load_camera_videos(request.cameras)
            
            # Start detection loop in background
            import asyncio
            asyncio.create_task(service.run_detection_loop(request.check_interval))
        
        return {
            "status": "success",
            "message": f"Detection started for {len(request.cameras)} camera(s)",
            "cameras": list(request.cameras.keys()),
            "check_interval": request.check_interval
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-detection")
async def stop_detection(
    current_user: dict = Depends(get_current_user)
):
    """Stop illegal parking detection service"""
    if current_user.get("role") not in ["admin", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and employee roles can stop detection"
        )
    
    try:
        service = get_detection_service()
        service.stop()
        return {
            "status": "success",
            "message": "Detection service stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/detection-status")
async def get_detection_status(
    current_user: dict = Depends(get_current_user)
):
    """Get status of illegal parking detection service"""
    try:
        service = get_detection_service()
        return {
            "status": "running" if service.running else "stopped",
            "cameras_monitored": list(service.video_captures.keys()),
            "model_loaded": service.model is not None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

