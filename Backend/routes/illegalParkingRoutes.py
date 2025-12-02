from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from controllers.illegalParkingController import (
    report_violation,
    get_all_violations,
    approve_violation,
    reject_violation
)
from deps.auth_deps import get_current_user, get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/illegal-parking", tags=["illegal-parking"])

class ViolationReport(BaseModel):
    cameraId: str
    zoneId: Optional[str] = None
    lineId: Optional[str] = None
    timestamp: Optional[datetime] = None
    vehicleImageUrl: Optional[str] = None
    videoClipUrl: Optional[str] = None
    plateNumber: Optional[str] = None
    severityScore: float = 0.0
    dwellTime: float = 0.0

@router.post("/violation")
async def report_violation_endpoint(
    violation_data: ViolationReport,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Report a new violation"""
    try:
        result = await report_violation(violation_data.dict(), db)
        return {"status": "success", "violation": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/violations")
async def get_violations_endpoint(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all violations with optional filters"""
    try:
        violations = await get_all_violations(camera_id, status, limit, db)
        return {"status": "success", "violations": violations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/approve/{violation_id}")
async def approve_violation_endpoint(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve a violation"""
    try:
        result = await approve_violation(violation_id, current_user, db)
        return {"status": "success", "violation": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reject/{violation_id}")
async def reject_violation_endpoint(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reject a violation"""
    try:
        result = await reject_violation(violation_id, current_user, db)
        return {"status": "success", "violation": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

