## Importing Modules
from fastapi import FastAPI
from fastapi import WebSocket
from fastapi.responses import HTMLResponse
import os
import cv2
import base64
from ultralytics import YOLO
import asyncio

#Initialising Apps
app = FastAPI()

#Variables
lights={
    "north": "red",
    "south": "red",
    "east": "red",
    "west": "red",
}
last_changed = 0

VIDEOS_DIR = os.path.join(os.path.dirname(__file__), 'Videos')
MODEL_PATH = 'yolov8n.pt'  # Assumes model is available

# Vehicle class IDs for COCO dataset (YOLOv8):
VEHICLE_CLASSES = {
    'car': 2,
    'motorcycle': 3,
    'bus': 5,
}

#Get routes
@app.get('/')
def slash():
    return {
        "message": "Hi"
    }

@app.get('/signal_status')
def signal():
    return  lights, last_changed

#Post Routes

@app.websocket('/ws/detect')
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    model = YOLO(MODEL_PATH)
    video_files = [f for f in os.listdir(VIDEOS_DIR) if f.endswith('.mp4')]
    tasks = []
    stop_event = asyncio.Event()

    async def stream_video(video_file):
        cap = cv2.VideoCapture(os.path.join(VIDEOS_DIR, video_file))
        try:
            while cap.isOpened() and not stop_event.is_set():
                ret, frame = cap.read()
                if not ret:
                    break
                results = model(frame)
                boxes = results[0].boxes
                counts = {'car': 0, 'motorcycle': 0, 'bus': 0}
                for box in boxes:
                    cls = int(box.cls[0])
                    for name, class_id in VEHICLE_CLASSES.items():
                        if cls == class_id:
                            counts[name] += 1
                total = sum(counts.values())
                annotated_frame = results[0].plot()
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                await websocket.send_json({
                    'frame': frame_b64,
                    'counts': counts,
                    'total': total,
                    'video': video_file
                })
                await asyncio.sleep(0.05)
        finally:
            cap.release()

    try:
        for video_file in video_files:
            tasks.append(asyncio.create_task(stream_video(video_file)))
        await asyncio.gather(*tasks)
    except Exception as e:
        stop_event.set()
    finally:
        await websocket.close()
