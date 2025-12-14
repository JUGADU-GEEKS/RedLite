import cv2
from ultralytics import YOLO
import os
import numpy as np
from typing import List, Dict, Any
import easyocr
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
        self.plate_captured = False
        self.ocr_in_progress = False

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
        
        # Handle empty detections
        if not detections or len(detections) == 0:
            # Mark all tracks as missed
            for tr in self.tracks:
                if tr.last_frame != frame_idx:
                    tr.mark_missed()
            
            # Filter active tracks
            active_tracks = []
            lost_tracks = []
            for t in self.tracks:
                if t.misses <= MAX_MISSES:
                    active_tracks.append(t)
                else:
                    lost_tracks.append(t)
            
            self.tracks = active_tracks
            return assigned, lost_tracks
        
        # Validate detections and calculate centroids
        valid_detections = []
        det_centroids = []
        for b in detections:
            if len(b) >= 4:
                x1, y1, x2, y2 = b[0], b[1], b[2], b[3]
                # Validate bounding box
                if x2 > x1 and y2 > y1 and x1 >= 0 and y1 >= 0:
                    valid_detections.append(b)
                    det_centroids.append(((x1 + x2) / 2.0, (y1 + y2) / 2.0))
        
        detections = valid_detections

        for i, det in enumerate(detections):
            cx, cy = det_centroids[i]
            best = None
            best_d = 1e9
            for tr in self.tracks:
                if len(tr.centroids) > 0:
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
        
        active_tracks = []
        lost_tracks = []
        for t in self.tracks:
            if t.misses <= MAX_MISSES:
                active_tracks.append(t)
            else:
                lost_tracks.append(t)
        
        self.tracks = active_tracks
        return assigned, lost_tracks

class WrongSideService:
    def __init__(self):
        # Get base directory (Backend/)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Load vehicle detection model with proper path resolution
        vehicle_model_path = os.path.join(base_dir, "yolov8n.pt")
        if not os.path.exists(vehicle_model_path):
            # Try alternative location
            vehicle_model_path = os.getenv("MODEL_PATH", "yolov8n.pt")
        try:
            self.vehicle_model = YOLO(vehicle_model_path)
            print(f"[WrongSide] Vehicle model loaded from {vehicle_model_path}")
        except Exception as e:
            print(f"[WrongSide] Error loading vehicle model: {e}")
            raise
        
        # Load plate detection model with proper path resolution
        plate_model_path = os.path.join(base_dir, "model", "plate.pt")
        if not os.path.exists(plate_model_path):
            print(f"[WrongSide] Warning: Plate model not found at {plate_model_path}, plate detection may fail")
            self.plate_model = None
        else:
            try:
                self.plate_model = YOLO(plate_model_path)
                print(f"[WrongSide] Plate model loaded from {plate_model_path}")
            except Exception as e:
                print(f"[WrongSide] Error loading plate model: {e}")
                self.plate_model = None
        
        # Initialize EasyOCR reader with error handling
        try:
            self.reader = easyocr.Reader(['en'], gpu=False)
            print("[WrongSide] EasyOCR reader initialized successfully")
        except Exception as e:
            print(f"[WrongSide] Error initializing EasyOCR: {e}")
            print("[WrongSide] OCR functionality will be disabled")
            self.reader = None

    async def _run_ocr_task(self, veh_crop, tr, video_path, detected_plates):
        """
        Runs OCR in a separate thread to avoid blocking the main video loop.
        """
        def blocking_ocr_logic():
            try:
                # Check if models are available
                if self.plate_model is None:
                    print(f"[OCR] Plate model not available, skipping OCR for track {tr.id}")
                    return None
                
                if self.reader is None:
                    print(f"[OCR] EasyOCR reader not available, skipping OCR for track {tr.id}")
                    return None
                
                # Validate vehicle crop
                if veh_crop is None or veh_crop.size == 0:
                    print(f"[OCR] Invalid vehicle crop for track {tr.id}")
                    return None
                
                # Run Plate Detection (YOLO is fast, but we can include it here or outside)
                # Since we passed the crop, we run plate detection here
                plate_results = self.plate_model(veh_crop, imgsz=DETECT_IMGSZ, conf=PLATE_CONF, verbose=False)[0]
                
                if len(plate_results.boxes) == 0:
                    return None

                # Get the best plate detection
                px1, py1, px2, py2 = plate_results.boxes.xyxy[0].cpu().numpy()
                
                # Validate plate crop coordinates
                h, w = veh_crop.shape[:2]
                px1, py1, px2, py2 = max(0, int(px1)), max(0, int(py1)), min(w, int(px2)), min(h, int(py2))
                
                if px2 <= px1 or py2 <= py1:
                    return None
                
                plate_crop = veh_crop[py1:py2, px1:px2]
                
                if plate_crop.size == 0:
                    return None
                
                # Preprocessing
                gray_plate = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
                scale_factor = 3
                h_plate, w_plate = gray_plate.shape
                
                # Prevent excessive upscaling
                if h_plate * scale_factor > 300 or w_plate * scale_factor > 1000:
                    scale_factor = min(300 / h_plate, 1000 / w_plate, 3)
                
                resized_plate = cv2.resize(gray_plate, (int(w_plate * scale_factor), int(h_plate * scale_factor)), interpolation=cv2.INTER_CUBIC)
                denoised_plate = cv2.fastNlMeansDenoising(resized_plate, None, 10, 7, 21)

                # Read text using EasyOCR (This is the slow part)
                results = self.reader.readtext(denoised_plate, detail=1)
                
                detected_texts = []
                for res in results:
                    text = res[1]
                    conf = res[2]
                    clean_text = "".join(e for e in text if e.isalnum()).upper()
                    if len(clean_text) >= 1 and conf > 0.2: 
                        detected_texts.append(clean_text)
                
                if detected_texts:
                    return "".join(detected_texts)
                return None
            except Exception as e:
                print(f"[OCR] OCR Logic Error: {e}")
                import traceback
                traceback.print_exc()
                return None

        try:
            # Run the blocking logic in a thread
            plate_number = await asyncio.to_thread(blocking_ocr_logic)
            
            if plate_number and len(plate_number) > 3:
                # Save to DB (async)
                vehicle_entry = WrongSideVehicle(
                    plate_number=plate_number,
                    timestamp=datetime.now(),
                    video_file=os.path.basename(video_path)
                )
                try:
                    await collection.insert_one(vehicle_entry.dict())
                    print(f"Saved wrong-way vehicle {plate_number} (Track {tr.id}) to database.")
                    tr.plate_captured = True
                    detected_plates.append(plate_number)
                except Exception as e:
                    print(f"DB Error: {e}")
        except Exception as e:
            print(f"OCR Task Wrapper Error: {e}")
        finally:
            # Always release the lock so we can try again if needed
            tr.ocr_in_progress = False

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
        # Normalize path for Windows compatibility
        output_dir = os.path.normpath(output_dir)
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
            try:
                results = self.vehicle_model(frame, imgsz=DETECT_IMGSZ, conf=VEH_CONF, verbose=False)[0]
                boxes_xyxy = results.boxes.xyxy.cpu().numpy() if getattr(results, 'boxes', None) is not None else np.empty((0, 4))
                classes = results.boxes.cls.cpu().numpy().astype(int) if getattr(results, 'boxes', None) is not None else np.empty((0,), dtype=int)
                vehicle_class_ids = {2, 3, 5, 7}  # car, motorbike, bus, truck
                
                # Filter vehicles and validate bounding boxes
                detections = []
                for b, c in zip(boxes_xyxy, classes):
                    if int(c) in vehicle_class_ids:
                        x1, y1, x2, y2 = map(float, b)
                        # Validate bounding box coordinates
                        if x2 > x1 and y2 > y1 and x1 >= 0 and y1 >= 0:
                            # Ensure coordinates are within frame bounds
                            x1 = max(0, min(x1, width - 1))
                            y1 = max(0, min(y1, height - 1))
                            x2 = max(x1 + 1, min(x2, width))
                            y2 = max(y1 + 1, min(y2, height))
                            detections.append((int(x1), int(y1), int(x2), int(y2)))
            except Exception as e:
                print(f"[WrongSide] Detection error: {e}")
                detections = []

            assigned, lost_tracks = tracker.update(detections, frame_idx)

            # Handle lost tracks that were wrong side but never got a plate
            for tr in lost_tracks:
                if tr.wrong_by_gates and not tr.plate_captured:
                     # Save as UNREADABLE
                     plate_number = f"UNREADABLE-{tr.id}"
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

            # Gate crossing logic
            def crossed(prev_y, cur_y, line_y):
                return (prev_y - line_y) * (cur_y - line_y) < 0

            yA_line = gate_A[0][1]
            yB_line = gate_B[0][1]

            for tr in tracker.tracks:
                if len(tr.bboxes) == 0:
                    continue
                    
                try:
                    x1, y1, x2, y2 = tr.bboxes[-1]
                    # Validate bounding box
                    if x2 <= x1 or y2 <= y1:
                        continue
                    
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
                                # We do NOT save immediately anymore. We wait for plate detection.
                                break
                except (IndexError, ValueError, TypeError) as e:
                    print(f"[WrongSide] Error processing track {tr.id}: {e}")
                    continue
            
            # OCR and Saving Logic for ALL flagged tracks
            for tr in tracker.tracks:
                # Only try to detect plate if:
                # 1. It is a wrong side vehicle
                # 2. We haven't captured the plate yet
                # 3. The vehicle was detected in the CURRENT frame (so we have a valid bbox)
                # 4. OCR is not already running for this vehicle
                if tr.wrong_by_gates and not tr.plate_captured and tr.last_frame == frame_idx and not tr.ocr_in_progress:
                    try:
                        # Get current bbox
                        if len(tr.bboxes) == 0:
                            continue
                            
                        x1, y1, x2, y2 = tr.bboxes[-1]
                        
                        # Validate and clamp coordinates
                        x1 = max(0, min(int(x1), width - 1))
                        y1 = max(0, min(int(y1), height - 1))
                        x2 = max(x1 + 1, min(int(x2), width))
                        y2 = max(y1 + 1, min(int(y2), height))
                        
                        # Crop vehicle
                        veh_crop = frame[y1:y2, x1:x2].copy()
                        
                        # Validate crop
                        if veh_crop.size == 0 or veh_crop.shape[0] < 10 or veh_crop.shape[1] < 10:
                            continue
                        
                        # Mark as in progress
                        tr.ocr_in_progress = True
                        
                        # Launch background task
                        asyncio.create_task(self._run_ocr_task(veh_crop, tr, video_path, detected_plates))
                    except (IndexError, ValueError, TypeError) as e:
                        print(f"[WrongSide] Error preparing OCR for track {tr.id}: {e}")
                        tr.ocr_in_progress = False
                        continue

            # Visualization

            # Visualization
            vis = frame.copy()
            # Draw gates
            cv2.line(vis, gate_A[0], gate_A[1], (0, 0, 255), 2)  # Red A
            cv2.putText(vis, 'Gate A', (10, gate_A[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            cv2.line(vis, gate_B[0], gate_B[1], (255, 0, 0), 2)  # Blue B
            cv2.putText(vis, 'Gate B', (10, gate_B[0][1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

            for tr in tracker.tracks:
                try:
                    if len(tr.bboxes) == 0:
                        continue
                    
                    x1, y1, x2, y2 = tr.bboxes[-1]
                    # Validate coordinates
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    if x2 <= x1 or y2 <= y1:
                        continue
                    
                    col = (0, 0, 255) if tr.flagged else (0, 255, 0) # Red if wrong way, Green otherwise
                    cv2.rectangle(vis, (x1, y1), (x2, y2), col, 2)
                    label = f"ID:{tr.id}"
                    if tr.wrong_by_gates:
                        label += " WRONG WAY!"
                    cv2.putText(vis, label, (x1, max(y1 - 6, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2)
                except (IndexError, ValueError, TypeError) as e:
                    print(f"[WrongSide] Error visualizing track {tr.id}: {e}")
                    continue

            out.write(vis)

            # Send frame via WebSocket if connected
            if websocket:
                try:
                    _, buffer = cv2.imencode('.jpg', vis, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    if buffer is not None:
                        frame_b64 = base64.b64encode(buffer).decode('utf-8')
                        await websocket.send_json({
                            "frame": frame_b64,
                            "detected_plates": list(set(detected_plates))
                        })
                        # Small delay to prevent overwhelming the frontend
                        await asyncio.sleep(0.03)  # Slightly longer delay for smoother streaming
                    else:
                        print("[WrongSide] Failed to encode frame")
                except Exception as e:
                    print(f"[WrongSide] WebSocket send error: {e}")
                    # Don't break, continue processing
                    import traceback
                    traceback.print_exc()

        cap.release()
        out.release()
        print(f"Video processing finished. Output saved to {output_path}")
        
        return {
            "detected_plates": list(set(detected_plates)),
            "output_video": output_filename
        }

