from fastapi import HTTPException, status
from datetime import datetime
from typing import List
from models.BoundaryLine import BoundaryLine, IllegalSide
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

async def create_boundary_line(
    line_data: dict,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Create a new boundary line"""
    now = datetime.utcnow()
    line_id = f"LINE-{uuid.uuid4().hex[:8].upper()}"
    
    line_doc = {
        "lineId": line_id,
        "cameraId": line_data.get("cameraId"),
        "points": line_data.get("points"),
        "illegalSide": line_data.get("illegalSide"),
        "lineName": line_data.get("lineName"),
        "createdBy": current_user.get("userId"),
        "updatedBy": current_user.get("userId"),
        "createdAt": now,
        "updatedAt": now
    }
    
    result = await db.boundary_lines.insert_one(line_doc)
    line_doc["_id"] = str(result.inserted_id)
    return line_doc

async def get_boundary_lines(
    camera_id: str,
    db: AsyncIOMotorDatabase
) -> List[dict]:
    """Get all boundary lines for a specific camera"""
    lines = await db.boundary_lines.find({"cameraId": camera_id}).to_list(length=100)
    return [convert_mongo_doc(line) for line in lines]

async def update_boundary_line(
    line_id: str,
    line_data: dict,
    current_user: dict,
    db: AsyncIOMotorDatabase
) -> dict:
    """Update an existing boundary line"""
    existing = await db.boundary_lines.find_one({"lineId": line_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Boundary line not found"
        )
    
    update_data = {
        "updatedBy": current_user.get("userId"),
        "updatedAt": datetime.utcnow()
    }
    
    if "points" in line_data:
        update_data["points"] = line_data["points"]
    if "illegalSide" in line_data:
        update_data["illegalSide"] = line_data["illegalSide"]
    if "lineName" in line_data:
        update_data["lineName"] = line_data["lineName"]
    
    await db.boundary_lines.update_one(
        {"lineId": line_id},
        {"$set": update_data}
    )
    
    updated = await db.boundary_lines.find_one({"lineId": line_id})
    return convert_mongo_doc(updated)

async def delete_boundary_line(
    line_id: str,
    db: AsyncIOMotorDatabase
) -> dict:
    """Delete a boundary line"""
    result = await db.boundary_lines.delete_one({"lineId": line_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Boundary line not found"
        )
    return {"status": "success", "message": "Boundary line deleted"}

