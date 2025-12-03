from fastapi import HTTPException, status
from datetime import datetime
from typing import List, Optional
from models.Violation import Violation, ViolationStatus
from deps.auth_deps import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import uuid

def convert_mongo_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = convert_mongo_doc(value)
            elif isinstance(value, list):
                result[key] = [convert_mongo_doc(item) for item in value]
            else:
                result[key] = value
        return result
    return doc

async def report_violation(
    violation_data: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Report a new violation"""
    now = datetime.utcnow()
    violation_id = f"VIOL-{uuid.uuid4().hex[:8].upper()}"
    
    violation_doc = {
        "cameraId": violation_data.get("cameraId"),
        "zoneId": violation_data.get("zoneId"),
        "lineId": violation_data.get("lineId"),
        "timestamp": violation_data.get("timestamp", now),
        "vehicleImageUrl": violation_data.get("vehicleImageUrl"),
        "videoClipUrl": violation_data.get("videoClipUrl"),
        "plateNumber": violation_data.get("plateNumber"),
        "severityScore": violation_data.get("severityScore", 0.0),
        "dwellTime": violation_data.get("dwellTime", 0.0),
        "status": ViolationStatus.PENDING.value,
        "createdAt": now,
        "updatedAt": now
    }
    
    result = await db.violations.insert_one(violation_doc)
    violation_doc["_id"] = str(result.inserted_id)
    return convert_mongo_doc(violation_doc)

async def get_all_violations(
    camera_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
    db: AsyncIOMotorDatabase = None
) -> List[dict]:
    """Get all violations with optional filters"""
    query = {}
    if camera_id:
        query["cameraId"] = camera_id
    if status_filter:
        query["status"] = status_filter
    
    violations = await db.violations.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return [convert_mongo_doc(violation) for violation in violations]

async def approve_violation(
    violation_id: str,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Approve a violation"""
    # Try ObjectId first, then fallback to string
    try:
        query = {"_id": ObjectId(violation_id)}
    except:
        query = {"_id": violation_id}
    
    violation = await db.violations.find_one(query)
    if not violation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found"
        )
    
    await db.violations.update_one(
        query,
        {
            "$set": {
                "status": ViolationStatus.APPROVED.value,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated = await db.violations.find_one(query)
    return convert_mongo_doc(updated)

async def reject_violation(
    violation_id: str,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Reject a violation"""
    # Try ObjectId first, then fallback to string
    try:
        query = {"_id": ObjectId(violation_id)}
    except:
        query = {"_id": violation_id}
    
    violation = await db.violations.find_one(query)
    if not violation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found"
        )
    
    await db.violations.update_one(
        query,
        {
            "$set": {
                "status": ViolationStatus.REJECTED.value,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    updated = await db.violations.find_one(query)
    return convert_mongo_doc(updated)

