# Illegal Parking Detection System - Technical Guide

## 🔍 How Backend Detection Works

### Libraries Used

1. **YOLO (You Only Look Once) - Ultralytics**
   - **Library**: `ultralytics` (YOLOv8)
   - **Purpose**: Real-time vehicle detection in video frames
   - **Model**: `yolov8n.pt` (nano version for speed)
   - **Detects**: Cars, motorcycles, buses, trucks (COCO classes 2, 3, 5, 7)

2. **OpenCV (cv2)**
   - **Library**: `opencv-python`
   - **Purpose**: Video frame capture, image processing, video manipulation
   - **Used for**: Reading video files, frame extraction, image encoding

3. **MongoDB (Motor)**
   - **Library**: `motor` (async MongoDB driver)
   - **Purpose**: Database operations for zones, boundary lines, violations
   - **Collections**: `zones`, `boundary_lines`, `violations`

4. **NumPy**
   - **Library**: `numpy`
   - **Purpose**: Array operations for image processing

5. **Python Standard Libraries**
   - `asyncio`: Asynchronous task management
   - `datetime`: Timestamp handling
   - `math`: Mathematical calculations (cross product, distance)

### Detection Algorithm

#### Step 1: Video Frame Capture
```python
# Continuously reads frames from video files
cap = cv2.VideoCapture(video_path)
ret, frame = cap.read()
```

#### Step 2: Vehicle Detection (YOLO)
```python
# YOLO detects vehicles in frame
results = model(frame)
# Returns: bounding boxes, class IDs, confidence scores
```

#### Step 3: Centroid Calculation
```python
# Calculate vehicle center point
centroid_x = (x1 + x2) / 2
centroid_y = (y1 + y2) / 2
```

#### Step 4: Stationary Detection
```python
# Track vehicle position over time
# If vehicle moves < 10 pixels for > 5 seconds → stationary
is_stationary, dwell_time = track_stationary_vehicle(...)
```

#### Step 5: Zone/Boundary Checking
```python
# Check if vehicle violates zones or boundary lines
is_violation, source, type = detect_illegal_parking(
    vehicle_centroid,
    zones=zones,
    boundary_lines=lines
)
```

#### Step 6: Severity Calculation
```python
# Calculate violation severity (0-100)
severity = calculate_severity_score(
    blocked_ratio,  # % of frame blocked
    dwell_time,     # How long stationary
    zone_type       # Type of zone violated
)
```

#### Step 7: Violation Reporting
```python
# Create violation record in database
await report_violation({
    cameraId, zoneId, lineId,
    plateNumber, severityScore, dwellTime,
    vehicleImageUrl, timestamp
})
```

## 🔄 Continuous Video Checking

### Current Implementation

**The system does NOT automatically start continuous checking on startup.**

### How to Start Continuous Detection

#### Option 1: Via API (Recommended)

```bash
POST http://localhost:8000/api/illegal-parking/start-detection
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "cameras": {
    "CAM-001": "/path/to/Videos/1.mp4",
    "CAM-002": "/path/to/Videos/2.mp4",
    "CAM-003": "/path/to/Videos/3.mp4",
    "CAM-004": "/path/to/Videos/5.mp4"
  },
  "check_interval": 2.0
}
```

#### Option 2: Programmatically

```python
from services.illegalParkingDetectionService import get_detection_service

service = get_detection_service()
service.load_camera_videos({
    "CAM-001": "Backend/Videos/1.mp4",
    "CAM-002": "Backend/Videos/2.mp4",
    "CAM-003": "Backend/Videos/3.mp4",
    "CAM-004": "Backend/Videos/5.mp4"
})

# Start in background
import asyncio
asyncio.create_task(service.run_detection_loop(check_interval=2.0))
```

### Detection Loop Behavior

1. **Continuous Monitoring**: Runs in background async loop
2. **Frame Processing**: Checks every 2 seconds (configurable)
3. **Video Looping**: Automatically resets to beginning when video ends
4. **Multi-Camera**: Processes all configured cameras in parallel
5. **Error Handling**: Continues running even if one camera fails

### Detection Flow Diagram

```
┌─────────────────┐
│  Video Feed     │
│  (CAM-001)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Read Frame     │
│  (cv2.VideoCapture)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  YOLO Detection │
│  (ultralytics)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculate      │
│  Centroids      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Track Movement │
│  (Stationary?)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Zones    │
│  & Boundaries   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Violation?     │
│  → Report       │
└─────────────────┘
```

## 📊 Detection Parameters

### Configurable Settings

- **Check Interval**: Time between frame checks (default: 2.0 seconds)
- **Stationary Threshold**: Max pixels moved to be "stationary" (default: 10px)
- **Time Threshold**: Min seconds stationary to trigger (default: 5.0s)
- **Confidence Threshold**: YOLO detection confidence (default: 0.25)

### Performance Considerations

- **YOLOv8n**: Fast, lightweight model (~6ms per frame on GPU)
- **Frame Skipping**: Only processes every Nth frame (configurable)
- **Async Processing**: Non-blocking, doesn't affect API responsiveness
- **Memory**: Keeps video captures open, minimal memory footprint

## 🛠️ API Endpoints

### Start Detection
```
POST /api/illegal-parking/start-detection
Body: { "cameras": {...}, "check_interval": 2.0 }
```

### Stop Detection
```
POST /api/illegal-parking/stop-detection
```

### Get Status
```
GET /api/illegal-parking/detection-status
Response: { "status": "running", "cameras_monitored": [...], "model_loaded": true }
```

## ⚠️ Important Notes

1. **Manual Start Required**: Detection does NOT start automatically
2. **Video Files Required**: Ensure video files exist at specified paths
3. **Zones/Lines Required**: Detection only works if zones or boundary lines are configured
4. **Database Required**: MongoDB must be running and accessible
5. **Model File Required**: `yolov8n.pt` must be in Backend directory

## 🔧 Troubleshooting

### Detection Not Working?

1. **Check if service is running**:
   ```bash
   GET /api/illegal-parking/detection-status
   ```

2. **Verify video files exist**:
   - Check paths in camera configuration
   - Ensure files are readable

3. **Check zones/lines are configured**:
   - Use frontend to create zones/boundary lines
   - Verify in database: `db.zones.find()`, `db.boundary_lines.find()`

4. **Check logs**:
   - Look for YOLO model loading messages
   - Check for video capture errors
   - Monitor violation reporting logs

5. **Verify YOLO model**:
   - Ensure `yolov8n.pt` exists in Backend directory
   - Check model loads without errors

