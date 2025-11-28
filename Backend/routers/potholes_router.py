from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from services.potholes_service import report_from_citizen, report_from_iot, get_all_for_map

router = APIRouter()


@router.post("/potholes/report")
async def pothole_report(file: UploadFile = File(...), lat: float = Form(...), lon: float = Form(...)):
    """Citizen upload endpoint.
    Expects multipart/form-data with `file` (image) and `lat`, `lon` (browser GPS).
    """
    # Validate lat/lon
    try:
        browser_lat = float(lat)
        browser_lon = float(lon)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid lat/lon provided")

    # Read file bytes
    data = await file.read()

    result = report_from_citizen(data, browser_lat, browser_lon)
    return result


@router.post("/potholes/iot")
async def pothole_iot(payload: dict):
    """IoT endpoint: accepts JSON {lat, lon, intensity?, vehicleId?}"""
    try:
        lat = float(payload.get("lat"))
        lon = float(payload.get("lon"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid lat/lon in payload")

    intensity = payload.get("intensity")
    vehicleId = payload.get("vehicleId")

    result = report_from_iot(lat, lon, intensity, vehicleId)
    return result


@router.get("/potholes/map")
async def potholes_map():
    """Return all grid records for map display."""
    return get_all_for_map()
