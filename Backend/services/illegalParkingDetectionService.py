"""
Illegal Parking Detection Service
Continuously monitors video feeds and detects illegal parking violations
"""
import asyncio
import cv2
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from ultralytics import YOLO
from bson import ObjectId

from services.violationEngine import (
    detect_illegal_parking,
    track_stationary_vehicle,
    calculate_severity_score,
    calculate_blocked_ratio
)
from controllers.illegalParkingController import report_violation
from core.config import MONGO_URL
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from utils.image_utils import save_vehicle_image, detect_license_plate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Vehicle class IDs for YOLO (COCO dataset)
VEHICLE_CLASS_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck

class IllegalParkingDetectionService:
    def __init__(self):
        self.model = None
        self.video_captures: Dict[str, cv2.VideoCapture] = {}
        self.vehicle_tracks: Dict[str, Dict] = {}  # {camera_id: {vehicle_id: track_data}}
        self.reported_violations: Dict[str, datetime] = {}  # Track recent violations to prevent duplicates
        self.running = False
        self.db: Optional[AsyncIOMotorDatabase] = None
        
        # Load YOLO model
        try:
            model_path = os.getenv('MODEL_PATH', 'yolov8n.pt')
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                logger.info(f"YOLO model loaded from {model_path}")
            else:
                logger.warning(f"YOLO model not found at {model_path}, detection will be limited")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
    
    async def initialize_db(self):
        """Initialize MongoDB connection"""
        if self.db is None:
            client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
            self.db = client.get_database("lanezy")
            logger.info("MongoDB connection established for detection service")
    
    def load_camera_videos(self, camera_configs: Dict[str, str]):
        """
        Load video files for cameras
        
        Args:
            camera_configs: Dict mapping camera_id to video file path
        """
        for camera_id, video_path in camera_configs.items():
            # Try multiple path variations
            possible_paths = [
                video_path,  # Original path
                os.path.join(os.path.dirname(os.path.dirname(__file__)), video_path),  # Relative to Backend
                video_path.replace('Backend/', ''),  # Remove Backend prefix if present
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Videos', os.path.basename(video_path))  # Videos directory
            ]
            
            loaded = False
            for path in possible_paths:
                normalized_path = os.path.normpath(path)
                if os.path.exists(normalized_path):
                    cap = cv2.VideoCapture(normalized_path)
                    if cap.isOpened():
                        self.video_captures[camera_id] = cap
                        self.vehicle_tracks[camera_id] = {}
                        logger.info(f"✓ Loaded video for {camera_id}: {normalized_path}")
                        loaded = True
                        break
                    else:
                        cap.release()
            
            if not loaded:
                logger.error(f"✗ Failed to load video for {camera_id}. Tried paths: {possible_paths}")
    
    async def get_zones_and_lines(self, camera_id: str) -> tuple:
        """Fetch zones and boundary lines for a camera"""
        if self.db is None:
            await self.initialize_db()
        
        zones = await self.db.zones.find({"cameraId": camera_id}).to_list(length=100)
        lines = await self.db.boundary_lines.find({"cameraId": camera_id}).to_list(length=100)
        
        # Convert ObjectId to string
        for zone in zones:
            if '_id' in zone and isinstance(zone['_id'], ObjectId):
                zone['_id'] = str(zone['_id'])
        for line in lines:
            if '_id' in line and isinstance(line['_id'], ObjectId):
                line['_id'] = str(line['_id'])
        
        return zones, lines
    
    def detect_vehicles(self, frame) -> List[Dict]:
        """
        Detect vehicles in a frame using YOLO
        
        Returns:
            List of vehicle detections with bbox and centroid
        """
        if not self.model:
            return []
        
        try:
            results = self.model(frame, verbose=False)
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        cls = int(box.cls[0])
                        if cls in VEHICLE_CLASS_IDS:
                            # Get bounding box
                            x1, y1, x2, y2 = map(float, box.xyxy[0])
                            conf = float(box.conf[0])
                            
                            # Calculate centroid
                            centroid_x = (x1 + x2) / 2
                            centroid_y = (y1 + y2) / 2
                            
                            detections.append({
                                'bbox': [x1, y1, x2, y2],
                                'centroid': [centroid_x, centroid_y],
                                'confidence': conf,
                                'class_id': cls
                            })
            
            return detections
        except Exception as e:
            logger.error(f"Error detecting vehicles: {e}")
            return []
    
    async def process_camera(self, camera_id: str, frame):
        """
        Process a single frame for a camera and detect violations
        
        Args:
            camera_id: Camera identifier
            frame: Video frame (numpy array)
        """
        if self.db is None:
            await self.initialize_db()
        
        # Get zones and boundary lines for this camera
        zones, lines = await self.get_zones_and_lines(camera_id)
        
        if not zones and not lines:
            # No zones or lines configured, skip detection
            return
        
        # Detect vehicles
        vehicles = self.detect_vehicles(frame)
        frame_height, frame_width = frame.shape[:2]
        
        # Process each detected vehicle
        for vehicle_idx, vehicle in enumerate(vehicles):
            vehicle_id = f"{camera_id}_{vehicle_idx}"
            centroid = vehicle['centroid']
            bbox = vehicle['bbox']
            
            # Track stationary status
            is_stationary, dwell_time = track_stationary_vehicle(
                vehicle_id,
                centroid,
                self.vehicle_tracks.get(camera_id, {}),
                stationary_threshold=10.0,
                time_threshold=5.0
            )
            
            if not is_stationary:
                continue  # Skip moving vehicles
            
            # Check for violations
            is_violation, violation_source, violation_type = detect_illegal_parking(
                vehicle_centroid=centroid,
                vehicle_bbox=bbox,
                zones=zones,
                boundary_lines=lines,
                frame_width=frame_width,
                frame_height=frame_height
            )
            
            if is_violation:
                # Calculate severity
                blocked_ratio = calculate_blocked_ratio(bbox, frame_width, frame_height)
                zone_type = violation_source.get('type') if violation_type == 'zone' else None
                severity_score = calculate_severity_score(
                    blocked_ratio=blocked_ratio,
                    dwell_time=dwell_time,
                    zone_type=zone_type
                )
                
                # Check if we've already reported this violation recently
                # (to avoid duplicate reports for the same vehicle)
                # Use zone/line + rounded position (grid-based) to handle slight position variations
                zone_or_line = violation_source.get('zoneId') or violation_source.get('lineId')
                # Round position to 50px grid to handle detection variance
                grid_x = int(centroid[0] / 50) * 50
                grid_y = int(centroid[1] / 50) * 50
                violation_key = f"{camera_id}_{grid_x}_{grid_y}_{violation_type}_{zone_or_line}"
                
                # Check if we've reported this violation in the last 5 minutes (300 seconds)
                current_time = datetime.utcnow()
                if violation_key in self.reported_violations:
                    last_reported = self.reported_violations[violation_key]
                    time_diff = (current_time - last_reported).total_seconds()
                    if time_diff < 300:  # 5 minutes cooldown
                        logger.info(f"Skipping duplicate violation for {violation_key} (reported {time_diff:.1f}s ago)")
                        continue
                
                # Also check database for recent violations in same zone/line
                try:
                    query = {
                        "cameraId": camera_id,
                        "timestamp": {"$gte": current_time - timedelta(minutes=5)},
                        "status": {"$in": ["pending", "approved"]}
                    }
                    # Add zone or line filter based on violation type
                    if violation_type == 'zone' and violation_source.get('zoneId'):
                        query["zoneId"] = zone_or_line
                    elif violation_type == 'boundary_line' and violation_source.get('lineId'):
                        query["lineId"] = zone_or_line
                    
                    recent_violations = await self.db.violations.find(query).to_list(length=1)
                    
                    if recent_violations:
                        logger.info(f"Skipping duplicate violation - recent violation found in database for {zone_or_line}")
                        continue
                except Exception as e:
                    logger.warning(f"Error checking database for duplicates: {e}")
                
                # Save vehicle image and detect license plate
                vehicle_image_url = None
                plate_number = None
                try:
                    # Save vehicle image
                    vehicle_image_url = save_vehicle_image(
                        frame=frame,
                        bbox=bbox,
                        camera_id=camera_id,
                        vehicle_id=vehicle_id
                    )
                    logger.info(f"Saved vehicle image: {vehicle_image_url}")
                    
                    # Detect license plate
                    logger.info(f"Attempting license plate detection for vehicle {vehicle_id}")
                    plate_number = detect_license_plate(frame, bbox)
                    if plate_number:
                        logger.info(f"✓ License plate detected: {plate_number}")
                    else:
                        logger.warning(f"✗ No license plate detected for vehicle {vehicle_id}")
                    
                except Exception as e:
                    logger.error(f"Error processing vehicle image/plate: {e}", exc_info=True)
                
                # Report violation
                try:
                    violation_data = {
                        "cameraId": camera_id,
                        "zoneId": violation_source.get('zoneId') if violation_type == 'zone' else None,
                        "lineId": violation_source.get('lineId') if violation_type == 'boundary_line' else None,
                        "timestamp": datetime.utcnow(),
                        "vehicleImageUrl": vehicle_image_url,
                        "videoClipUrl": None,  # Can be added if video clips are saved
                        "plateNumber": plate_number,
                        "severityScore": severity_score,
                        "dwellTime": dwell_time,
                        "status": "pending"
                    }
                    
                    await report_violation(violation_data, self.db)
                    # Mark this violation as reported
                    self.reported_violations[violation_key] = current_time
                    # Clean up old entries (older than 10 minutes)
                    cutoff_time = current_time - timedelta(minutes=10)
                    self.reported_violations = {
                        k: v for k, v in self.reported_violations.items() 
                        if v > cutoff_time
                    }
                    logger.info(f"✓ Violation reported for {camera_id}: {violation_type} violation, severity: {severity_score:.1f}, plate: {plate_number or 'N/A'}")
                except Exception as e:
                    logger.error(f"Error reporting violation: {e}")
    
    async def run_detection_loop(self, check_interval: float = 2.0):
        """
        Main detection loop - continuously processes video feeds
        
        Args:
            check_interval: Seconds between frame checks (default: 2 seconds)
        """
        await self.initialize_db()
        self.running = True
        
        logger.info("Starting illegal parking detection service...")
        logger.info(f"Monitoring {len(self.video_captures)} cameras")
        logger.info(f"Check interval: {check_interval} seconds")
        
        while self.running:
            try:
                for camera_id, cap in self.video_captures.items():
                    if not cap.isOpened():
                        continue
                    
                    ret, frame = cap.read()
                    if not ret:
                        # Reset video to beginning
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    
                    # Process frame for violations
                    await self.process_camera(camera_id, frame)
                
                # Wait before next check
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"Error in detection loop: {e}", exc_info=True)
                await asyncio.sleep(check_interval)
    
    def stop(self):
        """Stop the detection service"""
        self.running = False
        for cap in self.video_captures.values():
            if cap.isOpened():
                cap.release()
        logger.info("Illegal parking detection service stopped")

# Global service instance
_detection_service: Optional[IllegalParkingDetectionService] = None

def get_detection_service() -> IllegalParkingDetectionService:
    """Get or create the global detection service instance"""
    global _detection_service
    if _detection_service is None:
        _detection_service = IllegalParkingDetectionService()
    return _detection_service

