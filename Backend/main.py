## Importing Modules
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket
from fastapi.responses import HTMLResponse
import os
import cv2
import base64
from ultralytics import YOLO
import asyncio
import logging
import time
import json
from fastapi import Request
from fastapi import UploadFile, File, Form, HTTPException
import numpy as np
import json
import smtplib
from email.mime.text import MIMEText
from getpass import getpass
from fastapi import Response
from math import radians, cos, sin, asin, sqrt
logging.getLogger("ultralytics").setLevel(logging.WARNING)

# PRR-MASC Imports
from services.lane_service import lane_service
from routers.lane_router import router as lane_router
from routers.ws_router import router as ws_router

# Initialising Apps
app = FastAPI()
# Enable CORS using frontend origin if provided, else allow all (dev)
try:
    from core.config import FRONTEND_ORIGIN
    allow_origins = [FRONTEND_ORIGIN] if FRONTEND_ORIGIN else ["*"]
except Exception:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}
# Variables

def send_alert_email(location, alert_type='emergency'):
    # Load data.json
    with open('data.json', 'r') as f:
        data = json.load(f)
    # Find the email for the given location
    try:
        idx = data['locations'].index(location)
        to_email = data['emails'][idx]
    except (ValueError, KeyError, IndexError):
        print('Location or email not found!')
        return False

    from_email = 'devang9890@gmail.com'
    if alert_type == 'breakdown':
        subject = f'Vehicle Breakdown spotted at {location}'
        body = f'Vehicle Breakdown spotted at {location}'
    else:
        subject = f'Cow on road at {location}'
        body = f'Cow spotted still at {location}'

    # App password for devang9890@gmail.com (App Name: agent)
    app_password = 'vptx slib tbbs qdpa'

    # Create the email message
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email

    try:
        # Connect to Gmail SMTP server
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(from_email, app_password)
            server.sendmail(from_email, [to_email], msg.as_string())
        print(f'Email sent to {to_email}')
        return True
    except Exception as e:
        print('Failed to send email:', e)
        return False


def send_pothole_report(lat, lon, boxes):
    """Send an email report to the configured contact with pothole details."""
    try:
        # Load primary email from data.json
        with open('data.json', 'r') as f:
            data = json.load(f)
        emails = data.get('emails', [])
        to_email = emails[0] if emails else None
        if not to_email:
            print('[EMAIL] No recipient configured in data.json')
            return False

        from_email = 'devang9890@gmail.com'
        app_password = 'vptx slib tbbs qdpa'

        subject = f'Pothole Report - {time.strftime("%Y-%m-%d %H:%M:%S")}'
        body = f"""Pothole Report

Detected at: {time.strftime('%Y-%m-%d %H:%M:%S')}
Coordinates: {lat if lat is not None else 'N/A'}, {lon if lon is not None else 'N/A'}
Number of detections: {len(boxes)}

This is an automated notification from the Lanezy pothole detection system.
"""

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(from_email, app_password)
            server.sendmail(from_email, [to_email], msg.as_string())
        print(f'[EMAIL] Pothole report sent to {to_email}')
        return True
    except Exception as e:
        print(f'[EMAIL] Failed to send pothole report: {e}')
        return False


# Lane to location mapping
LANE_TO_LOCATION = {
    'north': 'Connaught Place, Delhi',
    'south': 'Chandni Chowk, Delhi',
    'east': 'Hauz Khas, Delhi',
    'west': 'Hauz Khas, Delhi',  # Update if you have a different location for west
}

# API endpoint to send breakdown alert
from fastapi import Body
from fastapi.responses import JSONResponse

# Include auth/admin routers
try:
    from routers.auth_router import router as auth_router
    from routers.admin_router import router as admin_router
    from routers.protected_examples import router as protected_router
    from routers.intersection_router import router as intersection_router
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(protected_router)
    app.include_router(intersection_router)
    # PRR-MASC Routers
    app.include_router(lane_router)
    app.include_router(ws_router)
except Exception as e:
    print(f"[ROUTERS] Skipped including auth/admin routers due to: {e}")

@app.on_event("startup")
async def startup_event():
    # Start LaneService background loop
    asyncio.create_task(lane_service.background_loop())

@app.on_event("shutdown")
async def shutdown_event():
    lane_service.release()

@app.post('/send_breakdown_alert')
async def send_breakdown_alert(data: dict = Body(...)):
    lane = data.get('lane')
    location = LANE_TO_LOCATION.get(lane)
    if not location:
        return JSONResponse({'status': 'error', 'message': 'Invalid lane'}, status_code=400)
    success = send_alert_email(location, alert_type='breakdown')
    if success:
        return {'status': 'ok'}
    else:
        return JSONResponse({'status': 'error', 'message': 'Failed to send email'}, status_code=500)

@app.post('/send_emergency_alert')
async def send_emergency_alert(data: dict = Body(...)):
    """Send emergency SOS alert to police station"""
    try:
        alert_type = data.get('type', 'emergency_sos')
        message = data.get('message', 'EMERGENCY SOS ALERT')
        location = data.get('location', 'Traffic intersection')
        
        # Use the same email infrastructure as breakdown alerts
        # Send to all configured emergency contacts
        from_email = 'devang9890@gmail.com'
        app_password = 'vptx slib tbbs qdpa'
        
        # Load emergency contacts from data.json
        with open('data.json', 'r') as f:
            data_config = json.load(f)
        
        # Get all emergency contact emails
        emergency_emails = data_config.get('emails', ['dhruvsh5467@gmail.com'])
        
        subject = f'🚨 EMERGENCY SOS ALERT - {location}'
        body = f"""
🚨 EMERGENCY SOS ALERT 🚨

URGENT: Immediate police assistance required!

Location: {location}
Time: {time.strftime('%Y-%m-%d %H:%M:%S')}
Message: {message}

This is an automated emergency alert from the Lanezy traffic management system.
A user has activated the emergency SOS button and requires immediate assistance.

System Location: {TRAFFIC_LIGHT_COORDS[0]}, {TRAFFIC_LIGHT_COORDS[1]}

PRIORITY: HIGH - Please respond immediately!

---
Lanezy Traffic Management System
Emergency Alert System
        """
        
        # Create the email message
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = ', '.join(emergency_emails)
        
        # Send email to all emergency contacts
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(from_email, app_password)
            server.sendmail(from_email, emergency_emails, msg.as_string())
        
        print(f'[EMERGENCY] SOS alert sent to {len(emergency_emails)} emergency contacts: {emergency_emails}')
        return {'status': 'success', 'message': 'Emergency alert sent successfully to all emergency contacts'}
        
    except Exception as e:
        print(f'[EMERGENCY] Failed to send SOS alert: {e}')
        return JSONResponse({'status': 'error', 'message': f'Failed to send emergency alert: {str(e)}'}, status_code=500)
lights = {
    "north": "red",
    "south": "red",
    "east": "red",
    "west": "red",
}
last_changed = 0
current_green = None
last_green_time = 0
last_switch_time = 0

VIDEOS_DIR = os.path.join(os.path.dirname(__file__), 'Videos')
MODEL_PATH = 'yolov8n.pt'  # Assumes model is available

# Vehicle class IDs for COCO dataset (YOLOv8):
VEHICLE_CLASSES = {
    'car': 2,
    'motorcycle': 3,
    'bus': 5,
}

# Lane mapping (adjust if needed)
LANE_VIDEO_MAP = {
    'north': '1.mp4',
    'south': '2.mp4',
    'east': '3.mp4',
    'west': '4.mp4',
}

# --- Start of Call Alert Integration ---

# --- Omnidim Python SDK Integration ---
from dotenv import load_dotenv
load_dotenv()
from omnidimension import Client

# Load environment variables with error handling
API_KEY = os.getenv('API_KEY')
AGENT_ID = os.getenv('AGENT_ID')
FROM_NUMBER_ID = os.getenv('FROM_NUMBER_ID')
TO_NUMBER = os.getenv('TO_NUMBER')

# Check if all required environment variables are present
OMNIDIM_CONFIGURED = all([API_KEY, AGENT_ID, FROM_NUMBER_ID, TO_NUMBER])

if not OMNIDIM_CONFIGURED:
    print("[WARNING] Omnidim SDK not configured. Missing environment variables:")
    if not API_KEY:
        print("  - API_KEY")
    if not AGENT_ID:
        print("  - AGENT_ID")
    if not FROM_NUMBER_ID:
        print("  - FROM_NUMBER_ID")
    if not TO_NUMBER:
        print("  - TO_NUMBER")
    print("  Create a .env file with these variables to enable call alerts.")
else:
    # Convert to appropriate types
    try:
        AGENT_ID = int(AGENT_ID)
        FROM_NUMBER_ID = int(FROM_NUMBER_ID)
        print("[INFO] Omnidim SDK configured successfully")
    except ValueError as e:
        print(f"[ERROR] Invalid environment variable format: {e}")
        OMNIDIM_CONFIGURED = False

def send_call_alert(coords):
    if not OMNIDIM_CONFIGURED:
        print("[CALL ALERT] Omnidim SDK not configured, skipping call alert")
        return {"success": False, "error": "Omnidim SDK not configured. Please set up environment variables."}
    
    try:
        client = Client(API_KEY)
        result = client.call.dispatch_call(
            agent_id=AGENT_ID,
            to_number=TO_NUMBER
        )
        print(f"[CALL ALERT] SDK result: {result}")
        return {"success": True, "result": result}
    except Exception as e:
        print(f"Failed to send call alert via SDK: {e}")
        return {"success": False, "error": str(e)}

from fastapi import Body
from fastapi.responses import JSONResponse

@app.post('/send_call_alert')
async def send_call_alert_endpoint(data: dict = Body(...)):
    coords = data.get('coords')
    if not coords:
        return JSONResponse({'success': False, 'message': 'Coordinates required'}, status_code=400)
    result = send_call_alert(coords)
    if not result.get('success'):
        return JSONResponse({'success': False, 'message': f"Failed to send call: {result.get('error', 'Unknown error')}"}, status_code=500)
    return result

# --- End of Call Alert Integration ---


TRAFFIC_LIGHT_COORDS = (28.612091,77.037639)
AMBULANCE_OVERRIDE_DURATION = 30  # seconds
ambulance_override = {
    'active': False,
    'direction': None,
    'end_time': 0
}

# Configuration file for traffic light coordinates
CONFIG_FILE = 'traffic_config.json'

def load_traffic_config():
    """Load traffic light coordinates from config file"""
    global TRAFFIC_LIGHT_COORDS
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                TRAFFIC_LIGHT_COORDS = (config.get('lat', 28.612091), config.get('lon', 77.037639))
                print(f"[CONFIG] Loaded traffic light coordinates: {TRAFFIC_LIGHT_COORDS}")
        else:
            # Create default config file
            save_traffic_config(TRAFFIC_LIGHT_COORDS[0], TRAFFIC_LIGHT_COORDS[1])
    except Exception as e:
        print(f"[CONFIG] Error loading config: {e}")
        print(f"[CONFIG] Using default coordinates: {TRAFFIC_LIGHT_COORDS}")

def save_traffic_config(lat, lon):
    """Save traffic light coordinates to config file"""
    try:
        config = {
            'lat': lat,
            'lon': lon,
            'updated_at': time.time()
        }
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"[CONFIG] Saved traffic light coordinates: ({lat}, {lon})")
    except Exception as e:
        print(f"[CONFIG] Error saving config: {e}")

# Load configuration on startup
load_traffic_config()

# --- Pothole detection endpoint ---
# Try to load a dedicated pothole model if available, otherwise reuse YOLO model
POTHOLE_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'potholes.pt')
POTHOLE_MODEL = None
try:
    if os.path.exists(POTHOLE_MODEL_PATH):
        POTHOLE_MODEL = YOLO(POTHOLE_MODEL_PATH)
        print(f"[MODEL] Loaded pothole model from {POTHOLE_MODEL_PATH}")
    else:
        # Fallback to general model if specific pothole model not found
        POTHOLE_MODEL = YOLO(MODEL_PATH)
        print(f"[MODEL] Pothole model not found, falling back to {MODEL_PATH}")
except Exception as e:
    POTHOLE_MODEL = None
    print(f"[MODEL] Failed to load pothole model: {e}")


@app.post('/analyze_issue')
async def analyze_issue(lat: float = Form(None), lon: float = Form(None), file: UploadFile = File(...)):
    """Analyze uploaded image/video for potholes. Returns detection status and provided coordinates.
    - Accepts a multipart/form-data file (image or video)
    - Optional form fields: lat, lon (floats)
    """
    # Validate file type
    content_type = file.content_type
    if not content_type or (not content_type.startswith('image/') and not content_type.startswith('video/')):
        raise HTTPException(status_code=400, detail='Invalid file type. Upload an image or video.')

    if POTHOLE_MODEL is None:
        raise HTTPException(status_code=500, detail='Pothole model not available on server')

    # Read file bytes
    data = await file.read()

    # For images - load using cv2.imdecode
    if content_type.startswith('image/'):
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail='Could not decode image')

        # Run inference
        try:
            results = POTHOLE_MODEL(img)
        except Exception as e:
            print(f"[ANALYZE] Model inference failed: {e}")
            raise HTTPException(status_code=500, detail='Model inference failed')

        # Check detections for pothole class
        detections = results[0].boxes
        pothole_detected = False
        pothole_boxes = []
        # Try to detect by name if names are available, otherwise check for class id 0 assumption
        names = results[0].names if hasattr(results[0], 'names') else {}
        for box in detections:
            cls = int(box.cls[0])
            conf = float(box.conf[0]) if hasattr(box, 'conf') else None
            label = names.get(cls, str(cls)) if isinstance(names, dict) else str(cls)
            # Consider 'pothole' label or class id 0 as pothole (fallback)
            if str(label).lower() == 'pothole' or cls == 0:
                pothole_detected = True
                x1, y1, x2, y2 = map(float, box.xyxy[0]) if hasattr(box, 'xyxy') else (0,0,0,0)
                pothole_boxes.append({'bbox': [x1, y1, x2, y2], 'confidence': conf, 'class': cls, 'label': label})

        # If detected, send a report email (non-blocking basic behavior)
        report_sent = False
        if pothole_detected:
            try:
                report_sent = send_pothole_report(lat, lon, pothole_boxes)
            except Exception as e:
                print(f"[ANALYZE] Error sending report email: {e}")

        response = {
            'pothole_detected': pothole_detected,
            'pothole_boxes': pothole_boxes,
            'coordinates': {'lat': lat, 'lon': lon},
            'report_sent': report_sent
        }
        return response

    else:
        # For videos: save temporarily and analyze first frame
        try:
            tmp_path = os.path.join(os.path.dirname(__file__), 'temp_upload')
            os.makedirs(tmp_path, exist_ok=True)
            tmp_file = os.path.join(tmp_path, file.filename)
            with open(tmp_file, 'wb') as f:
                f.write(data)
            cap = cv2.VideoCapture(tmp_file)
            ret, frame = cap.read()
            cap.release()
            os.remove(tmp_file)
            if not ret or frame is None:
                raise HTTPException(status_code=400, detail='Could not read video frame')

            results = POTHOLE_MODEL(frame)
            detections = results[0].boxes
            pothole_detected = False
            pothole_boxes = []
            names = results[0].names if hasattr(results[0], 'names') else {}
            for box in detections:
                cls = int(box.cls[0])
                conf = float(box.conf[0]) if hasattr(box, 'conf') else None
                label = names.get(cls, str(cls)) if isinstance(names, dict) else str(cls)
                if str(label).lower() == 'pothole' or cls == 0:
                    pothole_detected = True
                    x1, y1, x2, y2 = map(float, box.xyxy[0]) if hasattr(box, 'xyxy') else (0,0,0,0)
                    pothole_boxes.append({'bbox': [x1, y1, x2, y2], 'confidence': conf, 'class': cls, 'label': label})

            # If detected, send a report email
            report_sent = False
            if pothole_detected:
                try:
                    report_sent = send_pothole_report(lat, lon, pothole_boxes)
                except Exception as e:
                    print(f"[ANALYZE VIDEO] Error sending report email: {e}")

            response = {
                'pothole_detected': pothole_detected,
                'pothole_boxes': pothole_boxes,
                'coordinates': {'lat': lat, 'lon': lon},
                'report_sent': report_sent
            }
            return response
        except HTTPException:
            raise
        except Exception as e:
            print(f"[ANALYZE VIDEO] Failed: {e}")
            raise HTTPException(status_code=500, detail='Video analysis failed')


# Haversine formula to calculate distance between two lat/long points in meters
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of earth in meters
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

@app.post('/ambulance_override')
async def ambulance_override_post(request: Request):
    data = await request.json()
    lat = float(data.get('lat'))
    lon = float(data.get('long'))
    direction = data.get('direction')
    if direction not in ['north', 'south', 'east', 'west']:
        print(f"[AMBULANCE] Invalid direction: {direction}")
        return {"status": "error", "message": "Invalid direction"}
    dist = haversine(lat, lon, TRAFFIC_LIGHT_COORDS[0], TRAFFIC_LIGHT_COORDS[1])
    print(f"[AMBULANCE] Received: lat={lat}, lon={lon}, direction={direction}, distance={dist:.2f}m")
    if dist <= 5:
        ambulance_override['active'] = True
        ambulance_override['direction'] = direction
        ambulance_override['end_time'] = time.time() + AMBULANCE_OVERRIDE_DURATION
        print(f"[AMBULANCE] Ambulance within 5m, OVERRIDING {direction} to GREEN for {AMBULANCE_OVERRIDE_DURATION}s")
        return {"status": "ok", "override": True}
    else:
        print(f"[AMBULANCE] Ambulance not close enough for override.")
        return {"status": "ok", "override": False}

@app.post('/update_traffic_coords')
async def update_traffic_coords(request: Request):
    """Update traffic light coordinates"""
    try:
        data = await request.json()
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return JSONResponse({
                'status': 'error', 
                'message': 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
            }, status_code=400)
        
        # Update global coordinates
        global TRAFFIC_LIGHT_COORDS
        TRAFFIC_LIGHT_COORDS = (lat, lon)
        
        # Save to config file
        save_traffic_config(lat, lon)
        
        print(f"[CONFIG] Traffic light coordinates updated to: ({lat}, {lon})")
        return {
            'status': 'success',
            'message': 'Traffic light coordinates updated successfully',
            'coordinates': {'lat': lat, 'lon': lon}
        }
    except ValueError as e:
        return JSONResponse({
            'status': 'error',
            'message': 'Invalid coordinate values. Please provide valid numbers.'
        }, status_code=400)
    except Exception as e:
        return JSONResponse({
            'status': 'error',
            'message': f'Failed to update coordinates: {str(e)}'
        }, status_code=500)

@app.get('/get_traffic_coords')
async def get_traffic_coords():
    """Get current traffic light coordinates"""
    return {
        'status': 'success',
        'coordinates': {
            'lat': TRAFFIC_LIGHT_COORDS[0],
            'lon': TRAFFIC_LIGHT_COORDS[1]
        }
    }

@app.post('/set_current_location')
async def set_current_location(request: Request):
    """Set traffic light coordinates to current location (from browser geolocation)"""
    try:
        data = await request.json()
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return JSONResponse({
                'status': 'error', 
                'message': 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
            }, status_code=400)
        
        # Update global coordinates
        global TRAFFIC_LIGHT_COORDS
        TRAFFIC_LIGHT_COORDS = (lat, lon)
        
        # Save to config file
        save_traffic_config(lat, lon)
        
        print(f"[CONFIG] Traffic light coordinates set to current location: ({lat}, {lon})")
        return {
            'status': 'success',
            'message': 'Traffic light coordinates set to your current location',
            'coordinates': {'lat': lat, 'lon': lon}
        }
    except ValueError as e:
        return JSONResponse({
            'status': 'error',
            'message': 'Invalid coordinate values. Please provide valid numbers.'
        }, status_code=400)
    except Exception as e:
        return JSONResponse({
            'status': 'error',
            'message': f'Failed to set current location: {str(e)}'
        }, status_code=500)
  
@app.get('/')
def slash():
    return {
        "message": "Hi"
    }


@app.get('/signal_status')
def signal():
    return lights, last_changed

@app.websocket('/ws/detect')
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    model = YOLO(MODEL_PATH)
    caps = {lane: cv2.VideoCapture(os.path.join(VIDEOS_DIR, video)) for lane, video in LANE_VIDEO_MAP.items()}
    vehicle_counts = {lane: 0 for lane in LANE_VIDEO_MAP}
    cow_alert_sent = {lane: False for lane in LANE_VIDEO_MAP}  # Track if alert sent for cow in each lane
    global lights, last_changed, current_green, last_green_time, last_switch_time
    lights = {lane: "red" for lane in LANE_VIDEO_MAP}
    current_green = None
    last_green_time = time.time()
    last_switch_time = time.time()
    yellow_duration = 1  # seconds
    min_green = 10  # seconds
    max_green = 30  # seconds
    stop_event = asyncio.Event()

    try:
        manual_change_request = None
        async def receive_manual_change():
            nonlocal manual_change_request
            while not stop_event.is_set():
                data = await websocket.receive_text()
                msg = json.loads(data)
                if msg.get('type') == 'manual_change':
                    print(f"[RECEIVED] Manual change request for lane: {msg.get('lane')}")
                    manual_change_request = msg.get('lane')
        recv_task = asyncio.create_task(receive_manual_change())
        while not stop_event.is_set():
            # Ambulance override check
            now = time.time()
            if ambulance_override['active']:
                if now < ambulance_override['end_time']:
                    # Force the override direction to green, others to red
                    for lane in LANE_VIDEO_MAP: # Use LANE_VIDEO_MAP to get all lanes
                        lights[lane] = 'green' if lane == ambulance_override['direction'] else 'red'
                    current_green = ambulance_override['direction']
                    last_green_time = now  # keep resetting so normal logic doesn't interfere
                    print(f"[AMBULANCE] OVERRIDE ACTIVE: {ambulance_override['direction']} GREEN, others RED")
                    # Re-send current status to ensure clients are aware of override
                    await websocket.send_json({
                        'frame': None, # No new frame for override
                        'counts': {},
                        'total': 0,
                        'video': None,
                        'lights': lights,
                        'current_green': current_green,
                        'last_green_time': last_green_time,
                        'vehicle_counts': vehicle_counts,
                        'override_active': True,
                        'override_direction': ambulance_override['direction']
                    })
                    await asyncio.sleep(0.5) # Small delay to allow override to take effect
                    continue  # skip normal logic
                else:
                    print(f"[AMBULANCE] OVERRIDE ENDED, resuming normal operation.")
                    ambulance_override['active'] = False
                    ambulance_override['direction'] = None
                    ambulance_override['end_time'] = 0
                    # Re-send current status to ensure clients are aware of override end
                    await websocket.send_json({
                        'frame': None,
                        'counts': {},
                        'total': 0,
                        'video': None,
                        'lights': lights,
                        'current_green': current_green,
                        'last_green_time': last_green_time,
                        'vehicle_counts': vehicle_counts,
                        'override_active': False,
                        'override_direction': None
                    })

            # 1. Read one frame per lane and count vehicles
            for lane, cap in caps.items():
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                results = model(frame)
                boxes = results[0].boxes
                counts = {'car': 0, 'motorcycle': 0, 'bus': 0}
                cow_detected = False
                detected_classes = []
                for box in boxes:
                    cls = int(box.cls[0])
                    detected_classes.append(cls)
                    # Treat class 19 as 'cow' for this model
                    if cls == 19:
                        cow_detected = True
                    for name, class_id in VEHICLE_CLASSES.items():
                        if cls == class_id:
                            counts[name] += 1
                print(f"[DEBUG] Lane: {lane}, Detected class IDs: {detected_classes}")
                vehicle_counts[lane] = sum(counts.values())
                # Send cow alert if detected and not already sent
                if cow_detected and not cow_alert_sent[lane]:
                    location = LANE_TO_LOCATION.get(lane)
                    print(f"[DEBUG] Cow detected in {lane}, preparing to send alert email to {location}")
                    if location:
                        send_alert_email(location, alert_type='cow')
                        cow_alert_sent[lane] = True
                        print(f"[ALERT] Cow detected in {lane}, alert sent!")
                elif not cow_detected:
                    cow_alert_sent[lane] = False  # Reset if cow is gone
                annotated_frame = results[0].plot()
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                await websocket.send_json({
                    'frame': frame_b64,
                    'counts': counts,
                    'total': vehicle_counts[lane],
                    'video': LANE_VIDEO_MAP[lane],
                    'lights': lights,
                    'current_green': current_green,
                    'last_green_time': last_green_time,
                    'vehicle_counts': vehicle_counts
                })

            # 2. Decide on light switching
            now = time.time()
            if manual_change_request is not None and manual_change_request in LANE_VIDEO_MAP:
                requested_lane = manual_change_request
                manual_change_request = None
                if isinstance(requested_lane, str) and isinstance(current_green, str):
                    time_on_green = now - last_green_time
                    if requested_lane != current_green and time_on_green >= min_green:
                        print(f"[MANUAL] Manual change requested to {requested_lane}")
                        # Yellow transition for current green
                        lights[current_green] = "yellow"
                        print(f"[YELLOW] {current_green} turned YELLOW")
                        print(f"[LIGHTS] {lights}")
                        await websocket.send_json({'light_status': lights})
                        await asyncio.sleep(yellow_duration)
                        lights[current_green] = "red"
                        # Yellow transition for new green
                        lights[requested_lane] = "yellow"
                        print(f"[YELLOW] {requested_lane} will turn GREEN")
                        print(f"[LIGHTS] {lights}")
                        await websocket.send_json({'light_status': lights})
                        await asyncio.sleep(yellow_duration)
                        lights[requested_lane] = "green"
                        print(f"[SWITCH] {current_green} turned RED, {requested_lane} turned GREEN (manual)")
                        current_green = requested_lane
                        last_green_time = time.time()
                        last_switch_time = time.time()
            else:
                if current_green is None:
                    # No green yet, pick the most dense
                    max_lane = max(vehicle_counts, key=lambda l: vehicle_counts[l])
                    current_green = max_lane
                    lights = {lane: ("green" if lane == current_green else "red") for lane in LANE_VIDEO_MAP}
                    last_green_time = now
                    last_switch_time = now
                    print(f"[INIT] {current_green} turned GREEN (density: {vehicle_counts[current_green]})")
                else:
                    time_on_green = now - last_green_time
                    # Find the most and second most dense lanes
                    sorted_lanes = sorted(vehicle_counts.items(), key=lambda x: x[1], reverse=True)
                    most_dense_lane = sorted_lanes[0][0]
                    second_dense_lane = sorted_lanes[1][0] if len(sorted_lanes) > 1 else most_dense_lane
                    # 3. Light switching logic
                    if time_on_green < min_green:
                        # Must stay green for at least min_green seconds
                        pass
                    elif time_on_green >= max_green:
                        # Compulsory switch to second most dense
                        if current_green != second_dense_lane:
                            print(f"[MAX GREEN] {current_green} was green for {int(time_on_green)}s, switching to {second_dense_lane} (2nd most dense: {vehicle_counts[second_dense_lane]})")
                            # Yellow transition for current green
                            lights[current_green] = "yellow"
                            print(f"[YELLOW] {current_green} turned YELLOW")
                            print(f"[LIGHTS] {lights}")
                            await websocket.send_json({'light_status': lights})
                            await asyncio.sleep(yellow_duration)
                            lights[current_green] = "red"
                            # Yellow transition for new green
                            lights[second_dense_lane] = "yellow"
                            print(f"[YELLOW] {second_dense_lane} will turn GREEN")
                            print(f"[LIGHTS] {lights}")
                            await websocket.send_json({'light_status': lights})
                            await asyncio.sleep(yellow_duration)
                            lights[second_dense_lane] = "green"
                            print(f"[SWITCH] {current_green} turned RED, {second_dense_lane} turned GREEN")
                            current_green = second_dense_lane
                            last_green_time = time.time()
                            last_switch_time = time.time()
                        else:
                            # Already on second most dense, just reset timer
                            last_green_time = now
                    elif most_dense_lane != current_green and vehicle_counts[most_dense_lane] > vehicle_counts[current_green]:
                        # After min_green, switch if another lane is denser
                        print(f"[DENSER] {most_dense_lane} is now denser ({vehicle_counts[most_dense_lane]}) than {current_green} ({vehicle_counts[current_green]}), switching.")
                        # Yellow transition for current green
                        lights[current_green] = "yellow"
                        print(f"[YELLOW] {current_green} turned YELLOW")
                        print(f"[LIGHTS] {lights}")
                        await websocket.send_json({'light_status': lights})
                        await asyncio.sleep(yellow_duration)
                        lights[current_green] = "red"
                        # Yellow transition for new green
                        lights[most_dense_lane] = "yellow"
                        print(f"[YELLOW] {most_dense_lane} will turn GREEN")
                        print(f"[LIGHTS] {lights}")
                        await websocket.send_json({'light_status': lights})
                        await asyncio.sleep(yellow_duration)
                        lights[most_dense_lane] = "green"
                        print(f"[SWITCH] {current_green} turned RED, {most_dense_lane} turned GREEN")
                        current_green = most_dense_lane
                        last_green_time = time.time()
                        last_switch_time = time.time()
            # Print current light status
            print(f"[STATUS] Lights: {lights}, Vehicle counts: {vehicle_counts}, Time on green: {int(now - last_green_time)}s")
            await asyncio.sleep(0.5)  # Main loop delay
        recv_task.cancel()
    finally:
        for cap in caps.values():
            cap.release()
        await websocket.close()


