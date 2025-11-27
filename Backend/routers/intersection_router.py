from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from deps.auth_deps import get_current_user, require_role
from models.user import User
from models.intersections import IntersectionModel
from services import intersection_service

router = APIRouter()

@router.post("/intersections/create", dependencies=[Depends(require_role(["admin"]))])
def create_intersection(intersection: IntersectionModel):
    intersection_dict = intersection.dict(by_alias=True)
    intersection_id = intersection_service.create_intersection(intersection_dict)
    return {"status": "success", "intersection_id": intersection_id}

@router.get("/intersections/{intersection_id}", response_model=IntersectionModel)
def get_intersection(intersection_id: str, current_user: dict = Depends(get_current_user)):
    intersection = intersection_service.get_intersection_by_id(intersection_id)
    if not intersection:
        raise HTTPException(status_code=404, detail="Intersection not found")
    
    if current_user["role"] == "employee" and current_user["userId"] not in intersection.get("assignedEmployees", []):
        raise HTTPException(status_code=403, detail="Not authorized to view this intersection")
        
    return intersection

@router.get("/intersections", response_model=List[IntersectionModel], dependencies=[Depends(require_role(["admin"]))])
def list_intersections(skip: int = 0, limit: int = 10):
    intersections = intersection_service.get_all_intersections(skip, limit)
    return intersections

@router.post("/intersections/{intersection_id}/assign_employee", dependencies=[Depends(require_role(["admin"]))])
def assign_employee(intersection_id: str, employee_id: str = Body(..., embed=True)):
    if not intersection_service.assign_employee_to_intersection(intersection_id, employee_id):
        raise HTTPException(status_code=400, detail="Failed to assign employee")
    return {"status": "success", "message": f"Employee {employee_id} assigned to intersection {intersection_id}"}

@router.post("/intersections/{intersection_id}/unassign_employee", dependencies=[Depends(require_role(["admin"]))])
def unassign_employee(intersection_id: str, employee_id: str = Body(..., embed=True)):
    if not intersection_service.unassign_employee_from_intersection(intersection_id, employee_id):
        raise HTTPException(status_code=400, detail="Failed to unassign employee")
    return {"status": "success", "message": f"Employee {employee_id} unassigned from intersection {intersection_id}"}

@router.post("/intersections/{intersection_id}/register_device", dependencies=[Depends(require_role(["admin"]))])
def register_device(intersection_id: str, iot_device_id: str = Body(..., embed=True)):
    if not intersection_service.register_device_for_intersection(intersection_id, iot_device_id):
        raise HTTPException(status_code=400, detail="Failed to register device")
    return {"status": "success", "message": f"Device {iot_device_id} registered to intersection {intersection_id}"}

@router.post("/intersections/{intersection_id}/set_coordinates", dependencies=[Depends(require_role(["admin"]))])
def set_intersection_coordinates(intersection_id: str, payload: dict = Body(...)):
    lat = payload.get("lat")
    lon = payload.get("lon")
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude are required")
    try:
        lat_val = float(lat)
        lon_val = float(lon)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid coordinate values")

    if not (-90 <= lat_val <= 90) or not (-180 <= lon_val <= 180):
        raise HTTPException(status_code=400, detail="Coordinates out of range")

    intersection_service.update_coordinates_for_intersection(intersection_id, lat_val, lon_val)
    return {
        "status": "success",
        "message": f"Intersection {intersection_id} coordinates updated",
        "coordinates": {"lat": lat_val, "lon": lon_val}
    }

@router.get("/intersections/{intersection_id}/device")
def get_device_details(intersection_id: str):
    device_details = intersection_service.get_device_for_intersection(intersection_id)
    if not device_details:
        raise HTTPException(status_code=404, detail="Device not found for this intersection")
    return device_details

@router.get("/intersections/assigned/", response_model=List[IntersectionModel])
def get_assigned_intersections(current_user: dict = Depends(require_role(["employee", "admin"]))):
    if current_user["role"] == "admin":
        return intersection_service.get_all_intersections(limit=0) # No limit for admin
    else:
        return intersection_service.get_assigned_intersections_for_employee(current_user["userId"])
