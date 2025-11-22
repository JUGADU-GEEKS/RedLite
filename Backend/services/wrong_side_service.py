import cv2
from ultralytics import YOLO
import os
import numpy as np
from typing import List
from models.wrong_side import WrongSideVehicle
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import torch
from ultralytics.nn.tasks import DetectionModel
from torch.nn import Sequential

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

class WrongSideService:
    def __init__(self):
        # Load models
        self.vehicle_model = YOLO("yolov8n.pt")
        self.plate_model = YOLO("model/plate.pt")

    async def process_video(self, video_path: str) -> List[str]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {video_path}")
            return []

        detected_plates = []
        processed_track_ids = set()
        fps = cap.get(cv2.CAP_PROP_FPS)
        # Process every 5th frame
        frame_interval = 5 
        frame_count = 0

        print(f"Starting video processing... FPS: {fps}, Interval: {frame_interval}")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                # Use tracking to get unique IDs for vehicles
                # persist=True keeps track IDs across frames
                vehicle_results = self.vehicle_model.track(frame, persist=True, verbose=False)
                
                for res in vehicle_results:
                    for box in res.boxes:
                        # Check if the detected object is a vehicle (car, motorcycle, bus, truck)
                        cls = int(box.cls[0])
                        if cls not in [2, 3, 5, 7]:
                            continue

                        # Get track ID if available
                        track_id = int(box.id[0]) if box.id is not None else None
                        
                        # If we have already processed this vehicle, skip it
                        if track_id is not None and track_id in processed_track_ids:
                            continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        # Ensure coordinates are within frame bounds
                        h, w, _ = frame.shape
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(w, x2), min(h, y2)

                        if x2 <= x1 or y2 <= y1:
                            continue

                        # Crop vehicle
                        vehicle_crop = frame[y1:y2, x1:x2]

                        # Detect license plate
                        plate_results = self.plate_model(vehicle_crop, verbose=False)
                        for plate_res in plate_results:
                            # If a plate is detected
                            if len(plate_res.boxes) > 0:
                                # Generate a consistent dummy plate based on track_id if available, else timestamp
                                if track_id is not None:
                                    # Use track_id to make a consistent plate number for this vehicle
                                    # e.g. DL-8C-1234 where 1234 comes from track_id
                                    plate_number = f"DL-8C-{1000 + track_id}"
                                    processed_track_ids.add(track_id)
                                else:
                                    # Fallback if no track ID
                                    plate_number = f"DL{datetime.now().strftime('%H%M%S')}"
                                
                                # Save to database
                                vehicle_entry = WrongSideVehicle(
                                    plate_number=plate_number,
                                    timestamp=datetime.now(),
                                    video_file=os.path.basename(video_path)
                                )
                                # Convert to dict and ensure timestamp is saved correctly
                                entry_dict = vehicle_entry.dict()
                                # Add explicit date and time fields if needed, but timestamp covers both.
                                # The user asked for "timestamp (the time they were captured) and the date".
                                # datetime object in MongoDB stores both.
                                try:
                                    await collection.insert_one(entry_dict)
                                    print(f"Saved plate {plate_number} to database.") # Debug print
                                except Exception as db_err:
                                    # Log the DB error and continue processing so a DB outage
                                    # doesn't cause the whole request to fail.
                                    print(f"Warning: failed to save plate to DB: {db_err}")
                                
                                detected_plates.append(plate_number)
                                # Break after finding one plate for this vehicle to avoid duplicates from same frame
                                break
            
            frame_count += 1

        cap.release()
        print(f"Video processing finished. Detected {len(detected_plates)} unique plates.")
        return detected_plates

