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
                import json
                msg = json.loads(data)
                if msg.get('type') == 'manual_change':
                    print(f"[RECEIVED] Manual change request for lane: {msg.get('lane')}")
                    manual_change_request = msg.get('lane')
        recv_task = asyncio.create_task(receive_manual_change())
        while not stop_event.is_set():
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
