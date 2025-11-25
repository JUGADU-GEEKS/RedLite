import time
import math
from typing import Dict, List, Optional
from fastapi import HTTPException
from datetime import datetime, timedelta
from models.intersections import IntersectionModel
from services import intersection_service
from core.config import (
    EMERGENCY_OVERRIDE_DURATION,
    EMERGENCY_HEARTBEAT_TIMEOUT,
    EMERGENCY_CLEAR_DISTANCE,
    EMERGENCY_SEARCH_RADIUS,
    EMERGENCY_APPROACH_ANGLE
)
from services.override_db import override_collection

# Global state for emergency overrides (REPLACED BY DB)
# intersection_locks: Dict[str, Dict] = {}

# Constants
EARTH_RADIUS_METERS = 6371000

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_METERS * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing from point 1 to point 2 in degrees (0-360)."""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlon_rad = math.radians(lon2 - lon1)

    y = math.sin(dlon_rad) * math.cos(lat2_rad)
    x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dlon_rad)
    
    bearing_rad = math.atan2(y, x)
    bearing_deg = math.degrees(bearing_rad)
    return (bearing_deg + 360) % 360

def get_angle_difference(angle1: float, angle2: float) -> float:
    """Calculate the smallest difference between two angles in degrees."""
    diff = abs((angle1 - angle2 + 180) % 360 - 180)
    return diff

def find_nearest_intersection_ahead(lat: float, lon: float, heading: float) -> Optional[Dict]:
    """
    Find the nearest intersection that is "ahead" of the vehicle.
    "Ahead" means the angle difference between vehicle heading and bearing to intersection is <= EMERGENCY_APPROACH_ANGLE.
    Also filters by EMERGENCY_SEARCH_RADIUS.
    """
    # Get all intersections (optimize this in production to geospatial query)
    all_intersections = intersection_service.get_all_intersections(limit=1000)
    
    candidates = []
    print(f"[DEBUG] Finding nearest intersection for pos: ({lat}, {lon}), heading: {heading}")
    
    for intersection in all_intersections:
        # Handle Pydantic model or dict
        if isinstance(intersection, dict):
            i_coords = intersection.get("coordinates")
            i_id = intersection.get("intersectionId")
            i_name = intersection.get("name")
        else:
            i_coords = intersection.coordinates
            i_id = intersection.intersectionId
            i_name = intersection.name
            
        if not i_coords or "lat" not in i_coords or "lon" not in i_coords:
            continue
            
        i_lat = i_coords["lat"]
        i_lon = i_coords["lon"]
        
        dist = haversine_distance(lat, lon, i_lat, i_lon)
        
        # Filter by distance first
        if dist > EMERGENCY_SEARCH_RADIUS:
            continue

        bearing = calculate_bearing(lat, lon, i_lat, i_lon)
        angle_diff = get_angle_difference(heading, bearing)
        
        print(f"[DEBUG] Checking {i_id} ({i_name}): Dist={dist:.1f}m, Bearing={bearing:.1f}, AngleDiff={angle_diff:.1f}")
        
        # Check if ahead (angle diff <= EMERGENCY_APPROACH_ANGLE)
        if angle_diff <= EMERGENCY_APPROACH_ANGLE:
            candidates.append({
                "intersectionId": i_id,
                "name": i_name,
                "distance": dist,
                "bearing": bearing,
                "angle_diff": angle_diff,
                "lat": i_lat,
                "lon": i_lon
            })
            
    if not candidates:
        print("[DEBUG] No candidates found ahead")
        return None
        
    # Sort by distance and return the nearest
    candidates.sort(key=lambda x: x["distance"])
    best = candidates[0]
    print(f"[DEBUG] Selected {best['intersectionId']} ({best['name']}) at {best['distance']:.1f}m")
    return best

def determine_approach_lane(bearing_to_intersection: float) -> str:
    """
    Determine which lane the ambulance is approaching from based on bearing TO the intersection.
    
    If bearing is 0 (North), ambulance is South of intersection, approaching from South lane.
    If bearing is 90 (East), ambulance is West of intersection, approaching from West lane.
    If bearing is 180 (South), ambulance is North of intersection, approaching from North lane.
    If bearing is 270 (West), ambulance is East of intersection, approaching from East lane.
    """
    # Normalize bearing
    b = bearing_to_intersection % 360
    
    if 315 <= b or b < 45:
        return "south" # Approaching heading North -> coming from South
    elif 45 <= b < 135:
        return "west"  # Approaching heading East -> coming from West
    elif 135 <= b < 225:
        return "north" # Approaching heading South -> coming from North
    elif 225 <= b < 315:
        return "east"  # Approaching heading West -> coming from East
    return "north" # Fallback

def request_override(user_id: str, vehicle_id: str, lat: float, lon: float, heading: float, speed: float):
    """
    Process a request to start an emergency override.
    """
    target = find_nearest_intersection_ahead(lat, lon, heading)
    if not target:
        raise HTTPException(status_code=404, detail="No intersection found ahead")
        
    intersection_id = target["intersectionId"]
    distance = target["distance"]
    
    # Determine approach lane
    approach_lane = determine_approach_lane(target["bearing"])
    
    request_id = f"{user_id}_{int(time.time())}"
    
    # Locking Logic - Now using MongoDB
    current_lock = override_collection.find_one({"intersectionId": intersection_id})
    
    queue_position = 0

    if not current_lock:
        # Create new lock document
        new_lock = {
            "intersectionId": intersection_id,
            "intersectionName": target["name"],
            "lockOwner": request_id,
            "ownerVehicleId": vehicle_id,
            "ownerUserId": user_id,
            "queue": [],
            "createdAt": datetime.utcnow(),
            "expiresAt": datetime.utcnow() + timedelta(seconds=EMERGENCY_OVERRIDE_DURATION),
            "lastHeartbeat": datetime.utcnow(),
            "targetLane": approach_lane,
            "status": "active",
        }
        override_collection.insert_one(new_lock)
        status = new_lock["status"]
    else:
        # Lock exists
        if current_lock["lockOwner"] == request_id:
            # We already own it, just return status
            status = current_lock["status"]
        else:
            # Add to queue
            queue_item = {
                "requestId": request_id,
                "userId": user_id,
                "vehicleId": vehicle_id,
                "lat": lat,
                "lon": lon,
                "heading": heading,
                "speed": speed,
                "joinedAt": datetime.utcnow()
            }
            override_collection.update_one(
                {"_id": current_lock["_id"]},
                {"$push": {"queue": queue_item}}
            )
            queue_position = len(current_lock.get("queue", [])) + 1
            status = "queued"


    return {
        "status": status,
        "intersectionId": intersection_id,
        "intersectionName": target["name"],
        "targetLane": approach_lane,
        "distance": distance,
        "requestId": request_id,
        "queuePosition": queue_position
    }

def process_heartbeat(user_id: str, lat: float, lon: float, heading: float, speed: float):
    """
    Update position and check for clearing conditions.
    """
    # Find which lock this user owns
    active_lock = override_collection.find_one({"lockOwner": {"$regex": f"^{user_id}_"}})
    
    if not active_lock:
        # Nothing to update — the client must explicitly start again
        return {"status": "idle", "reason": "no_active_override"}

    intersection_id = active_lock["intersectionId"]
    
    # Update heartbeat only (do NOT extend expiry for fixed duration)
    update_data = {
        "$set": {
            "lastHeartbeat": datetime.utcnow()
        }
    }
    
    # Recalculate distance
    intersection = intersection_service.get_intersection_by_id(intersection_id)
    if not intersection:
        stop_override(user_id)
        return {"status": "cleared", "reason": "intersection_not_found"}
        
    i_coords = intersection["coordinates"]
    dist = haversine_distance(lat, lon, i_coords["lat"], i_coords["lon"])
    bearing_to_int = calculate_bearing(lat, lon, i_coords["lat"], i_coords["lon"])
    angle_diff = get_angle_difference(heading, bearing_to_int)
    
    # Check Auto-Clear Condition A: Passed intersection
    if dist > EMERGENCY_CLEAR_DISTANCE and angle_diff > 90:
        stop_override(user_id)
        return {"status": "cleared", "reason": "passed_intersection"}
    
    override_collection.update_one({"_id": active_lock["_id"]}, update_data)
    
    # Fetch the latest status to return
    updated_lock = override_collection.find_one({"_id": active_lock["_id"]})

    # Calculate remaining time
    remaining_seconds = 0
    if updated_lock.get("expiresAt"):
        remaining_seconds = (updated_lock["expiresAt"] - datetime.utcnow()).total_seconds()
        if remaining_seconds < 0:
            stop_override(user_id)
            return {"status": "cleared", "reason": "time_expired"}

    return {
        "status": updated_lock["status"],
        "intersectionId": intersection_id,
        "intersectionName": updated_lock["intersectionName"],
        "targetLane": updated_lock["targetLane"],
        "remainingSeconds": remaining_seconds,
        "distance": dist
    }

def stop_override(user_id: str):
    """
    Manually stop/clear the override for a user.
    """
    lock = override_collection.find_one({"lockOwner": {"$regex": f"^{user_id}_"}})
    if not lock:
        return False

    if lock["queue"]:
        # Promote next in queue
        next_req = lock["queue"][0]
        update_data = {
            "$set": {
                "lockOwner": next_req["requestId"],
                "ownerVehicleId": next_req["vehicleId"],
                "ownerUserId": next_req["userId"],
                "expiresAt": datetime.utcnow() + timedelta(seconds=EMERGENCY_OVERRIDE_DURATION),
                "lastHeartbeat": datetime.utcnow(),
                "status": "active"
            },
            "$pop": {"queue": -1} # Removes first element
        }
        override_collection.update_one({"_id": lock["_id"]}, update_data)
    else:
        # Remove lock entirely
        override_collection.delete_one({"_id": lock["_id"]})
    return True

def get_active_override(intersection_id: str) -> Optional[Dict]:
    """
    Get the active override details for a specific intersection from the database.
    """
    # The TTL index on 'expiresAt' handles cleanup automatically.
    # We can add a heartbeat check for more aggressive cleanup if needed.
    now = datetime.utcnow()
    stale_heartbeat_threshold = now - timedelta(seconds=EMERGENCY_HEARTBEAT_TIMEOUT)
    
    # Find an active lock for the intersection that is not stale
    lock = override_collection.find_one({
        "intersectionId": intersection_id,
        "status": "active",
        "lastHeartbeat": {"$gte": stale_heartbeat_threshold}
    })

    if lock:
        return {
            "active": True,
            "direction": lock["targetLane"],
            "vehicleId": lock["ownerVehicleId"]
        }
    return None

def get_driver_status(user_id: str) -> Dict:
    """
    Provide current override/queue state for a specific ambulance driver.
    """
    now = datetime.utcnow()
    lock = override_collection.find_one({"lockOwner": {"$regex": f"^{user_id}_"}})
    if lock:
        remaining = 0
        expires_at = lock.get("expiresAt")
        if isinstance(expires_at, datetime):
            remaining = (expires_at - now).total_seconds()
        
        return {
            "status": lock["status"],
            "intersectionId": lock["intersectionId"],
            "intersectionName": lock.get("intersectionName", "Unknown"),
            "remainingSeconds": remaining,
            "overrideActive": True
        }

    queued_lock = override_collection.find_one({"queue.requestId": {"$regex": f"^{user_id}_"}})
    if queued_lock:
        # Find position
        position = 0
        for idx, item in enumerate(queued_lock.get("queue", [])):
            if item["userId"] == user_id:
                position = idx + 1
                break
                
        return {
            "status": "queued",
            "queuePosition": position,
            "intersectionId": queued_lock["intersectionId"],
            "intersectionName": queued_lock.get("intersectionName", "Unknown"),
            "overrideActive": False
        }

    return {
        "status": "idle",
        "queuePosition": None,
        "overrideActive": False
    }

def get_override_overview() -> List[Dict]:
    """
    Snapshot of every active override/queue for admin dashboards.
    """
    now = datetime.utcnow()
    overview: List[Dict] = []
    for lock in override_collection.find({}):
        expires_at = lock.get("expiresAt")
        remaining = None
        if isinstance(expires_at, datetime):
            remaining = max(0, (expires_at - now).total_seconds())
        overview.append({
            "intersectionId": lock.get("intersectionId"),
            "intersectionName": lock.get("intersectionName"),
            "status": lock.get("status"),
            "targetLane": lock.get("targetLane"),
            "requestId": lock.get("lockOwner"),
            "ownerEta": lock.get("ownerEta"),
            "overrideActive": lock.get("status") == "active",
            "remainingSeconds": remaining,
            "queue": lock.get("queue", [])
        })
    return overview

