import cv2
from ultralytics import YOLO
import os
import numpy as np
from typing import List, Dict, Any
from models.wrong_side import WrongSideVehicle
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import torch
from ultralytics.nn.tasks import DetectionModel
from torch.nn import Sequential
import time
import base64
import asyncio

from core.config import MONGO_URL
import certifi

# Add required modules to the safe globals for torch.load
# This is required for newer versions of PyTorch
torch.serialization.add_safe_globals([DetectionModel, Sequential])

# Initialize MongoDB client (use certifi CA bundle for TLS verification)
client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
db_name = os.getenv("MONGODB_NAME", "lanezy")
db = client[db_name]
collection = db["wrong_side"]

# --- Gate Logic Constants ---
DETECT_IMGSZ = 640
VEH_CONF = 0.30
PLATE_CONF = 0.30
MAX_DIST_MATCH = 120
MAX_MISSES = 30
MOTION_WINDOW = 5
GATE_B_OFFSET = 160
GATE_GAP_PIX = 220
GATE_A_DOWN = 30
GATE_PAIR_WINDOW = 90

def point_in_polygon(polygon, pt):
    return cv2.pointPolygonTest(polygon, (int(pt[0]), int(pt[1])), False) >= 0

class Track:
    def __init__(self, tid, bbox, frame_idx):
        self.id = tid
        self.bboxes = [bbox]
        self.centroids = [self._centroid(bbox)]
        self.last_frame = frame_idx
        self.misses = 0
        self.flagged = False
        self.gate_state = {"A": None, "B": None}
        self.gate_cross_events = []
        self.wrong_by_gates = False

    def _centroid(self, b):
        x1, y1, x2, y2 = b
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    def update(self, bbox, frame_idx):
        self.bboxes.append(bbox)
        self.centroids.append(self._centroid(bbox))
        self.last_frame = frame_idx
        self.misses = 0

    def mark_missed(self):
        self.misses += 1

class SimpleTracker:
    def __init__(self):
        self.tracks = []
        self.next_id = 0

    def update(self, detections, frame_idx):
        assigned = {}
        det_centroids = [((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0) for b in detections]

        for i, det in enumerate(detections):
            cx, cy = det_centroids[i]
            best = None
            best_d = 1e9
            for tr in self.tracks:
                px, py = tr.centroids[-1]
                d = np.hypot(px - cx, py - cy)
                if d < best_d:
                    best_d = d
                    best = tr
            if best is not None and best_d < MAX_DIST_MATCH:
                best.update(det, frame_idx)
                assigned[i] = best.id
            else:
                tr = Track(self.next_id, det, frame_idx)
                self.tracks.append(tr)
                assigned[i] = tr.id
                self.next_id += 1

        for tr in self.tracks:
            if tr.last_frame != frame_idx:
                tr.mark_missed()
        self.tracks = [t for t in self.tracks if t.misses <= MAX_MISSES]
        return assigned

class WrongSideService:
    def __init__(self):
        # Load models
        self.vehicle_model = YOLO("yolov8n.pt")
        self.plate_model = YOLO("model/plate.pt")

    async def process_video(self, video_path: str, websocket=None) -> Dict[str, Any]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {video_path}")
            return {"detected_plates": [], "output_video": None}

        # Setup output video writer
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Output path in Frontend/public/Videos
        # Assuming Backend/services/wrong_side_service.py -> Backend/ -> ../Frontend/public/Videos
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        output_dir = os.path.join(base_dir, "Frontend", "public", "Videos")
        os.makedirs(output_dir, exist_ok=True)
        
        output_filename = f"processed_{os.path.basename(video_path)}"
        output_path = os.path.join(output_dir, output_filename)
        
        # Use mp4v codec
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        tracker = SimpleTracker()
        detected_plates = []
        frame_idx = 0
        
        # Lane polygon (full frame)
        lane_polygon = np.array([(0, 0), (width - 1, 0), (width - 1, height - 1), (0, height - 1)])

        print(f"Starting video processing with Gate Logic... FPS: {fps}")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            # Gates: Blue (B) offset from bottom, Red (A) above B
            yB = max(height - 1 - GATE_B_OFFSET, 0)
            gate_B = ((0, yB), (width - 1, yB))
            yA = max(yB - GATE_GAP_PIX + GATE_A_DOWN, 0)
            yA = min(yA, yB - 1)
            gate_A = ((0, yA), (width - 1, yA))

            # Detection (vehicles only)
            results = self.vehicle_model(frame, imgsz=DETECT_IMGSZ, conf=VEH_CONF, verbose=False)[0]
            boxes_xyxy = results.boxes.xyxy.cpu().numpy() if getattr(results, 'boxes', None) is not None else np.empty((0, 4))
            classes = results.boxes.cls.cpu().numpy().astype(int) if getattr(results, 'boxes', None) is not None else np.empty((0,), dtype=int)
            vehicle_class_ids = {2, 3, 5, 7}  # car, motorbike, bus, truck
            detections = [tuple(map(int, b)) for b, c in zip(boxes_xyxy, classes) if int(c) in vehicle_class_ids]

            tracker.update(detections, frame_idx)

            # Gate crossing logic
            def crossed(prev_y, cur_y, line_y):
                return (prev_y - line_y) * (cur_y - line_y) < 0

            yA_line = gate_A[0][1]
            yB_line = gate_B[0][1]

            for tr in tracker.tracks:
                x1, y1, x2, y2 = tr.bboxes[-1]
                cx = (x1 + x2) / 2.0
                cy = y2
                
                if not point_in_polygon(lane_polygon, (cx, cy)):
                    continue

                if len(tr.centroids) >= 2:
                    prev_cy = tr.centroids[-2][1]
                    if crossed(prev_cy, cy, yA_line):
                        tr.gate_cross_events.append(('A', frame_idx))
                    if crossed(prev_cy, cy, yB_line):
                        tr.gate_cross_events.append(('B', frame_idx))

                if len(tr.gate_cross_events) >= 2 and not tr.flagged:
                    tr.gate_cross_events = tr.gate_cross_events[-8:]
                    for i in range(len(tr.gate_cross_events) - 1):
                        g1, f1 = tr.gate_cross_events[i]
                        g2, f2 = tr.gate_cross_events[i + 1]
                        # Check for B -> A crossing (Wrong Way)
                        if g1 == 'B' and g2 == 'A' and 0 < (f2 - f1) <= GATE_PAIR_WINDOW:
                            tr.wrong_by_gates = True
                            tr.flagged = True
                            
                            # Crop and detect plate
                            veh_crop = frame[max(y1,0):min(y2,height), max(x1,0):min(x2,width)].copy()
                            plate_results = self.plate_model(veh_crop, imgsz=DETECT_IMGSZ, conf=PLATE_CONF, verbose=False)[0]
                            
                            plate_number = f"UNKNOWN-{tr.id}"
                            # Try to find a plate
                            if len(plate_results.boxes) > 0:
                                # Use track ID for consistent dummy plate if needed, or real OCR if implemented
                                # For now, using the logic from previous version:
                                plate_number = f"DL-8C-{1000 + tr.id}"
                            
                            # Save to DB
                            vehicle_entry = WrongSideVehicle(
                                plate_number=plate_number,
                                timestamp=datetime.now(),
                                video_file=os.path.basename(video_path)
                            )
                            try:
                                await collection.insert_one(vehicle_entry.dict())
                                print(f"Saved wrong-way vehicle {plate_number} (Track {tr.id}) to database.")
                            except Exception as e:
                                print(f"DB Error: {e}")
                            
                            detected_plates.append(plate_number)
                            break

            # Visualization
            vis = frame.copy()
            # Draw gates
            cv2.line(vis, gate_A[0], gate_A[1], (0, 0, 255), 2)  # Red A
            cv2.putText(vis, 'Gate A', (10, gate_A[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            cv2.line(vis, gate_B[0], gate_B[1], (255, 0, 0), 2)  # Blue B
            cv2.putText(vis, 'Gate B', (10, gate_B[0][1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

            for tr in tracker.tracks:
                x1, y1, x2, y2 = tr.bboxes[-1]
                col = (0, 0, 255) if tr.flagged else (0, 255, 0) # Red if wrong way, Green otherwise
                cv2.rectangle(vis, (x1, y1), (x2, y2), col, 2)
                label = f"ID:{tr.id}"
                if tr.wrong_by_gates:
                    label += " WRONG WAY!"
                cv2.putText(vis, label, (x1, max(y1 - 6, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2)

            out.write(vis)

            # Send frame via WebSocket if connected
            if websocket:
                _, buffer = cv2.imencode('.jpg', vis)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                try:
                    await websocket.send_json({
                        "frame": frame_b64,
                        "detected_plates": list(set(detected_plates))
                    })
                    # Small delay to prevent overwhelming the frontend
                    await asyncio.sleep(0.01)
                except Exception as e:
                    print(f"WebSocket send error: {e}")
                    break

        cap.release()
        out.release()
        print(f"Video processing finished. Output saved to {output_path}")
        
        return {
            "detected_plates": list(set(detected_plates)),
            "output_video": output_filename
        }

