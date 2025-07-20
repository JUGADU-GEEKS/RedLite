## Importing Modules
from fastapi import FastAPI
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
from math import radians, cos, sin, asin, sqrt
logging.getLogger("ultralytics").setLevel(logging.WARNING)

# Initialising Apps
app = FastAPI()

# Variables
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

TRAFFIC_LIGHT_COORDS = (28.7198611, 77.2621111)
AMBULANCE_OVERRIDE_DURATION = 30  # seconds
ambulance_override = {
    'active': False,
    'direction': None,
    'end_time': 0
}

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
                for box in boxes:
                    cls = int(box.cls[0])
                    for name, class_id in VEHICLE_CLASSES.items():
                        if cls == class_id:
                            counts[name] += 1
                vehicle_counts[lane] = sum(counts.values())
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
