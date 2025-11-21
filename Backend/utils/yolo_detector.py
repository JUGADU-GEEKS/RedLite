import cv2
import os
import base64
import logging
import numpy as np
from typing import Dict, Tuple, Any
from core.config import MODEL_PATH, VIDEOS_DIR, LANE_VIDEO_MAP, LANES

logger = logging.getLogger(__name__)

class FallbackDetector:
    def __init__(self):
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=16, detectShadows=True)
        logger.warning("FallbackDetector initialized (OpenCV MOG2)")

    def detect(self, frame: np.ndarray) -> Tuple[int, np.ndarray]:
        """
        Returns (count, annotated_frame)
        """
        if frame is None:
            return 0, frame
            
        # Resize for faster processing
        small_frame = cv2.resize(frame, (640, 360))
        mask = self.bg_subtractor.apply(small_frame)
        _, mask = cv2.threshold(mask, 250, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        count = 0
        annotated = frame.copy()
        # Scale factor to draw on original frame
        scale_x = frame.shape[1] / 640
        scale_y = frame.shape[0] / 360

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 500:  # Minimum area threshold for a vehicle
                count += 1
                x, y, w, h = cv2.boundingRect(cnt)
                # Scale back to original
                x = int(x * scale_x)
                y = int(y * scale_y)
                w = int(w * scale_x)
                h = int(h * scale_y)
                cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 0), 2)
        
        cv2.putText(annotated, f"Fallback Count: {count}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return count, annotated

class VideoYOLODetector:
    def __init__(self):
        self.model = None
        self.caps: Dict[str, cv2.VideoCapture] = {}
        self.use_fallback = False
        self.fallback_detector = None
        
        # Try loading YOLO
        try:
            from ultralytics import YOLO
            if os.path.exists(MODEL_PATH):
                self.model = YOLO(MODEL_PATH)
                logger.info(f"YOLO model loaded from {MODEL_PATH}")
            else:
                logger.warning(f"YOLO model not found at {MODEL_PATH}, using fallback.")
                self.use_fallback = True
        except ImportError:
            logger.warning("ultralytics not installed, using fallback.")
            self.use_fallback = True
        except Exception as e:
            logger.error(f"Error loading YOLO: {e}, using fallback.")
            self.use_fallback = True

        if self.use_fallback:
            self.fallback_detector = FallbackDetector()

        self._init_captures()

    def _init_captures(self):
        for lane in LANES:
            video_file = LANE_VIDEO_MAP.get(lane)
            if video_file:
                path = os.path.join(VIDEOS_DIR, video_file)
                if os.path.exists(path):
                    self.caps[lane] = cv2.VideoCapture(path)
                else:
                    logger.error(f"Video file not found: {path}")
                    # Could fallback to camera index 0, 1, etc. if needed
                    # self.caps[lane] = cv2.VideoCapture(0) 

    def _read_frame_from_cap(self, lane: str) -> np.ndarray:
        cap = self.caps.get(lane)
        if not cap or not cap.isOpened():
            return None
        ret, frame = cap.read()
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
        return frame if ret else None

    def get_cycle_snapshot(self) -> Tuple[Dict[str, int], Dict[str, str]]:
        """
        Returns (counts, frames_b64) for all lanes.
        This is called once at the start of a cycle.
        """
        counts = {}
        frames = {}
        
        for lane in LANES:
            frame = self._read_frame_from_cap(lane)
            if frame is None:
                counts[lane] = 0
                frames[lane] = ""
                continue

            if self.use_fallback:
                count, annotated = self.fallback_detector.detect(frame)
            else:
                # YOLO detection
                results = self.model(frame, verbose=False)
                # Count vehicles (car, motorcycle, bus, truck)
                # COCO classes: car=2, motorcycle=3, bus=5, truck=7
                vehicle_classes = [2, 3, 5, 7]
                count = 0
                boxes = results[0].boxes
                for box in boxes:
                    if int(box.cls[0]) in vehicle_classes:
                        count += 1
                annotated = results[0].plot()
            
            counts[lane] = count
            frames[lane] = self._frame_to_b64(annotated)
            
        return counts, frames

    def read_frame(self, lane: str) -> str:
        """
        Returns latest annotated base64 frame for a specific lane.
        Used for per-second updates.
        """
        frame = self._read_frame_from_cap(lane)
        if frame is None:
            return ""

        if self.use_fallback:
            _, annotated = self.fallback_detector.detect(frame)
        else:
            results = self.model(frame, verbose=False)
            annotated = results[0].plot()
            
        return self._frame_to_b64(annotated)

    def _frame_to_b64(self, frame: np.ndarray) -> str:
        _, buffer = cv2.imencode('.jpg', frame)
        return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    def release(self):
        for cap in self.caps.values():
            cap.release()
