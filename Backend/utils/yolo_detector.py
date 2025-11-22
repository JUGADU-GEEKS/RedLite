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

        logger.info(f"Initializing VideoYOLODetector for intersection {intersection_id}")
        logger.info(f"VIDEOS_DIR: {VIDEOS_DIR}")
        logger.info(f"VIDEOS_DIR exists: {os.path.exists(VIDEOS_DIR)}")

        try:
            if os.path.exists(MODEL_PATH):
                self.model = YOLO(MODEL_PATH)
                logger.info(f"YOLO model loaded successfully from {MODEL_PATH}")
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
            # Normalize path for Windows
            video_path = os.path.normpath(video_path)
            logger.debug(f"Checking video path for lane '{lane}': {video_path}")
            
            if os.path.exists(video_path):
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    self.video_captures[lane] = cap
                    logger.info(f"✓ Video for lane '{lane}' loaded successfully from {video_path}")
                else:
                    logger.error(f"✗ Failed to open video for lane '{lane}' at {video_path}")
            else:
                logger.error(f"✗ Video for lane '{lane}' not found at {video_path}")
        
        logger.info(f"Loaded {len(self.video_captures)}/{len(LANES)} video captures")

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
        
        # Initialize all lanes to ensure all are present in the result
        for lane in LANES:
            counts[lane] = 0
            frames_b64[lane] = ""

        for lane, cap in self.video_captures.items():
            if not cap or not cap.isOpened():
                logger.warning(f"Video capture for lane '{lane}' is not available")
                continue
                
            ret, frame = cap.read()
            if ret:
                count, frame_b64 = self._process_frame(lane, frame)
                counts[lane] = count
                frames_b64[lane] = frame_b64
                logger.debug(f"Lane '{lane}': detected {count} vehicles")
            else:
                # Reset to beginning if video ended
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if ret:
                    count, frame_b64 = self._process_frame(lane, frame)
                    counts[lane] = count
                    frames_b64[lane] = frame_b64
                    logger.debug(f"Lane '{lane}': detected {count} vehicles (after reset)")
                else:
                    logger.warning(f"Failed to read frame for lane '{lane}' even after reset")

        logger.info(f"Cycle snapshot counts: {counts}")
        return counts, frames_b64

    def read_frame(self, lane: str) -> str:
        cap = self.video_captures.get(lane)
        if not cap:
            logger.debug(f"No video capture for lane '{lane}'")
            return ""

        ret, frame = cap.read()
        if not ret:
            # Reset to beginning if video ended
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Failed to read frame for lane '{lane}'")
                return ""

        try:
            count, frame_b64 = self._process_frame(lane, frame)
            return frame_b64
        except Exception as e:
            logger.error(f"Error processing frame for lane '{lane}': {e}")
            return ""

    def release(self):
        for cap in self.video_captures.values():
            cap.release()
        logger.info("Video captures released.")

