from fastapi import HTTPException
from pymongo import MongoClient
import certifi
from bson import ObjectId
import time
from datetime import datetime
from core.config import MONGO_URL
from models.intersections import IntersectionModel

# Use certifi CA bundle to ensure TLS certs validate correctly on macOS/local dev
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
# Get database name from connection string or default to 'lanezy'
try:
    db_name = client.get_database().name
except:
    db_name = "lanezy"
db = client[db_name]
intersections_collection = db["intersections"]
users_collection = db["users"]

def create_intersection(intersection_data: dict):
    # Ensure _id is handled correctly
    if "_id" in intersection_data:
        if not intersection_data["_id"] or intersection_data["_id"] == "":
            del intersection_data["_id"]
        elif isinstance(intersection_data["_id"], str):
            try:
                intersection_data["_id"] = ObjectId(intersection_data["_id"])
            except:
                # If invalid ObjectId string, remove it and let Mongo generate
                del intersection_data["_id"]

    intersection_data["createdAt"] = int(time.time())
    intersection_data["updatedAt"] = int(time.time())
    result = intersections_collection.insert_one(intersection_data)
    return str(result.inserted_id)

def get_intersection_by_id(intersection_id: str):
    return intersections_collection.find_one({"intersectionId": intersection_id})

def get_all_intersections(skip: int = 0, limit: int = 10):
    return list(intersections_collection.find().skip(skip).limit(limit))

def assign_employee_to_intersection(intersection_id: str, employee_id: str):
    print(f"Attempting to assign {employee_id} to {intersection_id}")
    user = users_collection.find_one({"userId": employee_id, "role": "employee"})
    if not user:
        print(f"Employee {employee_id} not found")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update Intersection
    result_intersection = intersections_collection.update_one(
        {"intersectionId": intersection_id},
        {"$addToSet": {"assignedEmployees": employee_id}, "$set": {"updatedAt": int(time.time())}}
    )
    
    # Update User
    result_user = users_collection.update_one(
        {"userId": employee_id},
        {"$addToSet": {"assignedIntersections": intersection_id}, "$set": {"updatedAt": datetime.utcnow()}}
    )
    
    print(f"Intersection matched: {result_intersection.matched_count}, modified: {result_intersection.modified_count}")
    print(f"User matched: {result_user.matched_count}, modified: {result_user.modified_count}")

    return result_intersection.matched_count > 0

def unassign_employee_from_intersection(intersection_id: str, employee_id: str):
    # Update Intersection
    result_intersection = intersections_collection.update_one(
        {"intersectionId": intersection_id},
        {"$pull": {"assignedEmployees": employee_id}, "$set": {"updatedAt": int(time.time())}}
    )
    
    # Update User
    users_collection.update_one(
        {"userId": employee_id},
        {"$pull": {"assignedIntersections": intersection_id}, "$set": {"updatedAt": datetime.utcnow()}}
    )
    
    return result_intersection.modified_count > 0

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
