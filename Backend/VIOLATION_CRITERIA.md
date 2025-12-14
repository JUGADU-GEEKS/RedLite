# Illegal Parking Violation Criteria

## When Does a Vehicle Appear in the Violation List?

A vehicle appears in the violation list when it meets **ANY** of the following criteria:

### 1. Zone-Based Violations

A vehicle is flagged if:
- **The vehicle's centroid (center point) is inside a zone** AND **the zone has `illegalInside = true`**
- **OR** the vehicle is **outside a zone** AND **the zone has `illegalInside = false`**

**Example:**
- Zone Type: `NO_PARKING` with `illegalInside = true`
- If a vehicle's center point is detected inside this polygon → **VIOLATION**

### 2. Boundary Line Violations

A vehicle is flagged if:
- **The vehicle is on the illegal side** of a boundary line
- Illegal side can be: `LEFT`, `RIGHT`, or `BOTH`

**Detection Method:**
- Uses cross-product calculation to determine which side of the line the vehicle is on
- Compares vehicle position against the line's `illegalSide` setting

**Example:**
- Boundary line with `illegalSide = "LEFT"`
- If vehicle's centroid is on the left side of the line → **VIOLATION**

### 3. Stationary Detection

For a violation to be reported, the vehicle must also be:
- **Stationary for a minimum time threshold** (default: 5 seconds)
- Tracked using centroid-based movement detection
- If vehicle moves more than threshold pixels, tracking resets

### 4. Severity Scoring

Each violation is assigned a severity score (0-100) based on:
- **Blocked Ratio** (0-30 points): Percentage of frame area blocked by vehicle
- **Dwell Time** (0-20 points): How long vehicle has been stationary
- **Zone Type Multiplier**:
  - `NO_PARKING`: 1.0x
  - `BUS_LANE`: 1.2x
  - `FOOTPATH`: 1.5x (highest priority)
  - `LOADING_ZONE`: 0.8x

## Violation Data Stored

Each violation record contains:

1. **Identification:**
   - `cameraId`: Which camera detected the violation
   - `zoneId`: Zone ID if zone-based violation (optional)
   - `lineId`: Boundary line ID if line-based violation (optional)

2. **Vehicle Information:**
   - `plateNumber`: Detected license plate number (if available)
   - `vehicleImageUrl`: URL to captured vehicle image
   - `videoClipUrl`: URL to video clip showing the violation

3. **Violation Metrics:**
   - `severityScore`: Calculated severity (0-100)
   - `dwellTime`: Time vehicle was stationary (seconds)
   - `timestamp`: When violation occurred

4. **Status:**
   - `status`: `pending`, `approved`, `rejected`, or `auto-escalated`

## Automatic Detection Flow

1. **Video Frame Processing:**
   - Extract frame from camera feed
   - Run vehicle detection (YOLO or similar)
   - Get vehicle bounding boxes and centroids

2. **Zone/Boundary Checking:**
   - For each detected vehicle:
     - Check if centroid is inside any illegal zone
     - Check if centroid violates any boundary line
     - Track stationary time

3. **Violation Reporting:**
   - If violation detected AND vehicle is stationary:
     - Capture vehicle image
     - Extract license plate (if possible)
     - Calculate severity score
     - Create violation record with status `pending`

4. **Review Process:**
   - Traffic officials review pending violations
   - Can approve (becomes official) or reject (false positive)
   - Auto-escalation for high-severity violations

## Manual Violation Creation

Violations can also be manually created via:
- API endpoint: `POST /api/illegal-parking/violation`
- Frontend "Create Test Violation" button
- Python script: `scripts/create_test_violations.py`

