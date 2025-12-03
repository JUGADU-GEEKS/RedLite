from fastapi import HTTPException, status
from datetime import datetime
from typing import List, Optional
from models.Zone import Zone, ZoneType
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

async def create_zone(
    zone_data: dict,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Create a new zone"""
    now = datetime.utcnow()
    zone_id = f"ZONE-{uuid.uuid4().hex[:8].upper()}"
    
    zone_doc = {
        "zoneId": zone_id,
        "cameraId": zone_data.get("cameraId"),
        "type": zone_data.get("type"),
        "polygon": zone_data.get("polygon"),
        "illegalInside": zone_data.get("illegalInside", True),
        "createdBy": current_user.get("userId"),
        "updatedBy": current_user.get("userId"),
        "createdAt": now,
        "updatedAt": now
    }
    
    result = await db.zones.insert_one(zone_doc)
    zone_doc["_id"] = str(result.inserted_id)
    return zone_doc

async def get_zones_by_camera(
    camera_id: str,
    db: AsyncIOMotorDatabase
) -> List[dict]:
    """Get all zones for a specific camera"""
    zones = await db.zones.find({"cameraId": camera_id}).to_list(length=100)
    return [convert_mongo_doc(zone) for zone in zones]

async def update_zone(
    zone_id: str,
    zone_data: dict,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Update an existing zone"""
    existing = await db.zones.find_one({"zoneId": zone_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    update_data = {
        "updatedBy": current_user.get("userId"),
        "updatedAt": datetime.utcnow()
    }
    
    if "type" in zone_data:
        update_data["type"] = zone_data["type"]
    if "polygon" in zone_data:
        update_data["polygon"] = zone_data["polygon"]
    if "illegalInside" in zone_data:
        update_data["illegalInside"] = zone_data["illegalInside"]
    
    await db.zones.update_one(
        {"zoneId": zone_id},
        {"$set": update_data}
    )
    
    updated = await db.zones.find_one({"zoneId": zone_id})
    return convert_mongo_doc(updated)

async def delete_zone(
    zone_id: str,
    db: AsyncIOMotorDatabase
) -> dict:
    """Delete a zone"""
    result = await db.zones.delete_one({"zoneId": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    return {"status": "success", "message": "Zone deleted"}

