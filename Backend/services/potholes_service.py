from fastapi import HTTPException
from pymongo import MongoClient
import certifi
from core.config import MONGO_URL, MODEL_PATH
from datetime import datetime, timedelta
import os
from bson import ObjectId
from utils.exif_utils import extract_exif_gps_and_time
from utils.gps_utils import haversine_meters, grid_bucket
import numpy as np
import cv2
from ultralytics import YOLO
import logging

logger = logging.getLogger(__name__)

# Setup MongoDB client
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
try:
    db_name = client.get_database().name
except Exception:
    db_name = "lanezy"
db = client[db_name]
potholes_collection = db["potholes"]

# Load pothole model lazily
_POTHOLE_MODEL = None


def _get_pothole_model():
    global _POTHOLE_MODEL
    if _POTHOLE_MODEL is not None:
        return _POTHOLE_MODEL

    # Prefer a dedicated pothole model in Backend/model/potholes.pt
    possible = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model', 'potholes.pt')
    if os.path.exists(possible):
        model_path = possible
    else:
        model_path = MODEL_PATH

    try:
        _POTHOLE_MODEL = YOLO(model_path)
        logger.info(f"Loaded pothole model from {model_path}")
    except Exception as e:
        logger.exception(f"Failed to load pothole model: {e}")
        _POTHOLE_MODEL = None
    return _POTHOLE_MODEL


def report_from_citizen(file_bytes: bytes, browser_lat: float, browser_lon: float):
    """Process citizen upload: validate EXIF, run YOLO once, update DB.

    Returns dict with success/detected/gridId/potholeCount or raises HTTPException.
    """
    # Step 1: Extract EXIF
    exif = extract_exif_gps_and_time(file_bytes)
    if not exif:
        raise HTTPException(status_code=400, detail="Please capture a LIVE photo using camera (no gallery images).")

    exif_lat, exif_lon, exif_time = exif
    now = datetime.utcnow()

    # Step 2: Validate location (anti-fake)
    distance_m = haversine_meters(browser_lat, browser_lon, exif_lat, exif_lon)
    if distance_m > 40:
        raise HTTPException(status_code=400, detail="Location mismatch. Please take the picture at the pothole location.")

    # Validate timestamp
    if exif_time is None:
        raise HTTPException(status_code=400, detail="Please capture a LIVE photo using camera (no gallery images).")
    if now - exif_time > timedelta(minutes=2):
        raise HTTPException(status_code=400, detail="Photo too old. Please capture a fresh photo.")

    # Step 3: Run YOLO pothole detection (only once)
    model = _get_pothole_model()
    if model is None:
        raise HTTPException(status_code=500, detail="Pothole model not available on server")

    # Decode image to cv2
    np_arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    try:
        results = model(img)
    except Exception as e:
        logger.exception(f"Model inference failed: {e}")
        raise HTTPException(status_code=500, detail="Model inference failed")

    detections = results[0].boxes
    pothole_detected = False
    names = results[0].names if hasattr(results[0], 'names') else {}
    for box in detections:
        cls = int(box.cls[0])
        conf = float(box.conf[0]) if hasattr(box, 'conf') else None
        # Skip low-confidence detections
        if conf is not None and conf < 0.35:
            continue
        label = names.get(cls, str(cls)) if isinstance(names, dict) else str(cls)
        if str(label).lower() == 'pothole' or cls == 0:
            pothole_detected = True
            break

    if not pothole_detected:
        return {"detected": False}

    # Step 4: Compute 50m grid bucket
    gridId, base_lat, base_lon, _, _ = grid_bucket(browser_lat, browser_lon)

    # Step 5: Update or create pothole entry
    report_entry = {
        "source": "citizen",
        "lat": browser_lat,
        "lon": browser_lon,
        "timestamp": now,
    }

    # Upsert: create if not exists, else increment
    update_result = potholes_collection.update_one(
        {"gridId": gridId},
        {
            "$inc": {"potholeCount": 1},
            "$set": {"latestReportTime": now, "status": "pending"},
            "$setOnInsert": {"gridId": gridId, "lat": base_lat, "lon": base_lon}
        },
        upsert=True
    )

    # Push report
    potholes_collection.update_one({"gridId": gridId}, {"$push": {"reports": report_entry}})

    doc = potholes_collection.find_one({"gridId": gridId})
    pothole_count = int(doc.get("potholeCount", 0)) if doc else 0

    return {"success": True, "detected": True, "gridId": gridId, "potholeCount": pothole_count}


def report_from_iot(lat: float, lon: float, intensity: float = None, vehicleId: str = None):
    gridId, base_lat, base_lon, _, _ = grid_bucket(lat, lon)
    now = datetime.utcnow()
    report_entry = {"source": "iot", "lat": lat, "lon": lon, "timestamp": now}

    potholes_collection.update_one(
        {"gridId": gridId},
        {
            "$inc": {"potholeCount": 1},
            "$set": {"latestReportTime": now, "status": "pending"},
            "$setOnInsert": {"gridId": gridId, "lat": base_lat, "lon": base_lon}
        },
        upsert=True,
    )
    potholes_collection.update_one({"gridId": gridId}, {"$push": {"reports": report_entry}})
    doc = potholes_collection.find_one({"gridId": gridId})
    pothole_count = int(doc.get("potholeCount", 0)) if doc else 0
    return {"success": True, "gridId": gridId, "potholeCount": pothole_count}


def get_all_for_map():
    docs = list(potholes_collection.find())
    out = []
    for d in docs:
        out.append({
            "lat": d.get("lat"),
            "lon": d.get("lon"),
            "potholeCount": int(d.get("potholeCount", 0)),
            "status": d.get("status", "pending")
        })
    return out
