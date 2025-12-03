# Illegal Parking Detection - Quick Start Guide

## ✅ System Status: READY

All components are implemented and working. CAM-004 has been added.

## 🚀 Quick Start

### 1. Start Backend
```bash
cd Backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend
```bash
cd Frontend
npm run dev
```

### 3. Access System
- Go to: `http://localhost:5173`
- Login as `employee` or `admin`
- Click "Illegal Parking" in navigation

## 📹 Cameras Available

- **CAM-001**: Main Street Camera (`/Videos/1.mp4`)
- **CAM-002**: Park Avenue Camera (`/Videos/2.mp4`)
- **CAM-003**: Highway Camera (`/Videos/3.mp4`)
- **CAM-004**: City Center Camera (`/Videos/5.mp4`) ✨ NEW

## 🔧 Setup Steps

### Step 1: Create Zones or Boundary Lines
1. Go to Illegal Parking Dashboard
2. Select a camera (CAM-001 to CAM-004)
3. Click "Edit Zones" or "Edit Boundaries"
4. Draw zones/lines on the canvas
5. Save

### Step 2: Start Continuous Detection (Optional)
```bash
POST http://localhost:8000/api/illegal-parking/start-detection
Authorization: Bearer YOUR_TOKEN

{
  "cameras": {
    "CAM-001": "Backend/Videos/1.mp4",
    "CAM-002": "Backend/Videos/2.mp4",
    "CAM-003": "Backend/Videos/3.mp4",
    "CAM-004": "Backend/Videos/5.mp4"
  },
  "check_interval": 2.0
}
```

### Step 3: View Violations
1. Click "Violations" tab
2. See all detected violations
3. Click any violation for full details
4. Approve/Reject as needed

## 🔍 Detection Libraries

- **YOLO (Ultralytics)**: Vehicle detection
- **OpenCV**: Video processing
- **MongoDB (Motor)**: Database
- **NumPy**: Image processing

## 📝 Notes

- Detection must be manually started via API
- Zones/boundary lines must be created first
- System continuously monitors once started
- Violations appear in real-time in the ViolationList

