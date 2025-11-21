from fastapi import HTTPException
from pymongo import MongoClient
from bson import ObjectId
import time
from core.config import MONGO_URL
from models.intersections import IntersectionModel

client = MongoClient(MONGO_URL)
# Get database name from connection string or default to 'lanezy'
try:
    db_name = client.get_database().name
except:
    db_name = "lanezy"
db = client[db_name]
intersections_collection = db["intersections"]
users_collection = db["users"]

def create_intersection(intersection_data: dict):
    intersection_data["createdAt"] = int(time.time())
    intersection_data["updatedAt"] = int(time.time())
    result = intersections_collection.insert_one(intersection_data)
    return str(result.inserted_id)

def get_intersection_by_id(intersection_id: str):
    return intersections_collection.find_one({"intersectionId": intersection_id})

def get_all_intersections(skip: int = 0, limit: int = 10):
    return list(intersections_collection.find().skip(skip).limit(limit))

def assign_employee_to_intersection(intersection_id: str, employee_id: str):
    user = users_collection.find_one({"userId": employee_id, "role": "employee"})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    result = intersections_collection.update_one(
        {"intersectionId": intersection_id},
        {"$addToSet": {"assignedEmployees": employee_id}, "$set": {"updatedAt": int(time.time())}}
    )
    return result.modified_count > 0

def unassign_employee_from_intersection(intersection_id: str, employee_id: str):
    result = intersections_collection.update_one(
        {"intersectionId": intersection_id},
        {"$pull": {"assignedEmployees": employee_id}, "$set": {"updatedAt": int(time.time())}}
    )
    return result.modified_count > 0

def register_device_for_intersection(intersection_id: str, device_id: str):
    result = intersections_collection.update_one(
        {"intersectionId": intersection_id},
        {"$set": {"iotDeviceId": device_id, "updatedAt": int(time.time())}}
    )
    return result.modified_count > 0

def get_device_for_intersection(intersection_id: str):
    intersection = get_intersection_by_id(intersection_id)
    if not intersection or not intersection.get("iotDeviceId"):
        return None
    # This is a placeholder for getting the signal state.
    # In a real implementation, this would query the IoT device or a related service.
    traffic_signal_state = {"signal": "green"} 
    return {"iotDeviceId": intersection["iotDeviceId"], "signal": traffic_signal_state}

def get_assigned_intersections_for_employee(employee_id: str):
    return list(intersections_collection.find({"assignedEmployees": employee_id}))
