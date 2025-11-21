import cv2
import base64
import logging
import os
from typing import Dict, Tuple

from ultralytics import YOLO
from core.config import LANES, MODEL_PATH, VIDEOS_DIR, LANE_VIDEO_MAP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FallbackDetector:
    def __init__(self):
        self.mog = cv2.createBackgroundSubtractorMOG2()

    def detect(self, frame):
        fg_mask = self.mog.apply(frame)
        _, thresh = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        count = 0
        for contour in contours:
            if cv2.contourArea(contour) > 500:
                count += 1
                x, y, w, h = cv2.boundingRect(contour)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        return count, frame

class VideoYOLODetector:
    def __init__(self, intersection_id: str):
        self.intersection_id = intersection_id
        self.video_captures = {}
        self.model = None
        self.fallback_detector = FallbackDetector()

        try:
            if os.path.exists(MODEL_PATH):
                self.model = YOLO(MODEL_PATH)
                logger.info("YOLO model loaded successfully.")
            else:
                raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
        except Exception as e:
            logger.warning(f"YOLO model load failed: {e} — using fallback detector.")
            self.model = None

        for lane in LANES:
            video_file = LANE_VIDEO_MAP.get(lane)
            if not video_file:
                logger.warning(f"No video file mapping for lane '{lane}'")
                continue
            
            video_path = os.path.join(VIDEOS_DIR, video_file)
            if os.path.exists(video_path):
                self.video_captures[lane] = cv2.VideoCapture(video_path)
            else:
                logger.warning(f"Video for lane '{lane}' not found at {video_path}")

    def _process_frame(self, lane: str, frame):
        if self.model:
            results = self.model(frame)
            count = len(results[0].boxes)
            annotated_frame = results[0].plot()
        else:
            count, annotated_frame = self.fallback_detector.detect(frame)
        
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_b64 = base64.b64encode(buffer).decode('utf-8')
        return count, frame_b64

    def get_cycle_snapshot(self) -> Tuple[Dict[str, int], Dict[str, str]]:
        counts = {}
        frames_b64 = {}

        for lane, cap in self.video_captures.items():
            ret, frame = cap.read()
            if ret:
                count, frame_b64 = self._process_frame(lane, frame)
                counts[lane] = count
                frames_b64[lane] = frame_b64
            else:
                counts[lane] = 0
                frames_b64[lane] = ""
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        return counts, frames_b64

    def read_frame(self, lane: str) -> str:
        cap = self.video_captures.get(lane)
        if not cap:
            return ""

        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                return ""

        _, frame_b64 = self._process_frame(lane, frame)
        return frame_b64

    def release(self):
        for cap in self.video_captures.values():
            cap.release()
        logger.info("Video captures released.")

