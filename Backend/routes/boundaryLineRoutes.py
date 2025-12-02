from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from controllers.boundaryLineController import (
    create_boundary_line,
    get_boundary_lines,
    update_boundary_line,
    delete_boundary_line
)
from deps.auth_deps import get_current_user, get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/boundary-lines", tags=["boundary-lines"])

class BoundaryLineCreate(BaseModel):
    cameraId: str
    points: List[List[float]]
    illegalSide: str
    lineName: Optional[str] = None

class BoundaryLineUpdate(BaseModel):
    points: List[List[float]] = None
    illegalSide: str = None
    lineName: Optional[str] = None

@router.post("/create")
async def create_boundary_line_endpoint(
    line_data: BoundaryLineCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new boundary line"""
    try:
        result = await create_boundary_line(line_data.dict(), current_user, db)
        return {"status": "success", "boundaryLine": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{camera_id}")
async def get_boundary_lines_endpoint(
    camera_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all boundary lines for a camera"""
    try:
        lines = await get_boundary_lines(camera_id, db)
        return {"status": "success", "boundaryLines": lines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{line_id}")
async def update_boundary_line_endpoint(
    line_id: str,
    line_data: BoundaryLineUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a boundary line"""
    try:
        # Filter out None values
        update_dict = {k: v for k, v in line_data.dict().items() if v is not None}
        result = await update_boundary_line(line_id, update_dict, current_user, db)
        return {"status": "success", "boundaryLine": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{line_id}")
async def delete_boundary_line_endpoint(
    line_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a boundary line"""
    try:
        result = await delete_boundary_line(line_id, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

