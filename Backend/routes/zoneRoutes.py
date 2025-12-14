from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from controllers.zoneController import (
    create_zone,
    get_zones_by_camera,
    update_zone,
    delete_zone
)
from deps.auth_deps import get_current_user, get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/zones", tags=["zones"])

class ZoneCreate(BaseModel):
    cameraId: str
    type: str
    polygon: List[List[float]]
    illegalInside: bool = True

class ZoneUpdate(BaseModel):
    type: str = None
    polygon: List[List[float]] = None
    illegalInside: bool = None

@router.post("/create")
async def create_zone_endpoint(
    zone_data: ZoneCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new zone"""
    try:
        result = await create_zone(zone_data.dict(), current_user, db)
        return {"status": "success", "zone": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{camera_id}")
async def get_zones_endpoint(
    camera_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all zones for a camera"""
    try:
        zones = await get_zones_by_camera(camera_id, db)
        return {"status": "success", "zones": zones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{zone_id}")
async def update_zone_endpoint(
    zone_id: str,
    zone_data: ZoneUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a zone"""
    try:
        # Filter out None values
        update_dict = {k: v for k, v in zone_data.dict().items() if v is not None}
        result = await update_zone(zone_id, update_dict, current_user, db)
        return {"status": "success", "zone": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{zone_id}")
async def delete_zone_endpoint(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a zone"""
    try:
        result = await delete_zone(zone_id, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

