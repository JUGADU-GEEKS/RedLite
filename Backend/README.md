## PRR-MASC Subsystem

This backend implements a Priority-Rank-based Regulation for Multi-Agent Systems at Crossroads (PRR-MASC) for intelligent traffic light control. The system uses vehicle density detection to dynamically adjust signal timings, aiming to reduce congestion and wait times.

### Features

- **Vehicle Detection**: Utilizes YOLOv8 for real-time vehicle detection from video streams. It includes a fallback to a classic OpenCV-based detector (Background Subtraction) if the YOLO model fails to load.
- **Dynamic Ranking**: Ranks lanes based on vehicle density and an "age" factor (time since last green light) to prioritize traffic flow.
- **Fixed Durations**: Assigns green light durations based on rank: 45s, 30s, 15s, 15s.
- **Real-time Updates**: Broadcasts per-second updates via WebSockets, including annotated video frames, vehicle counts, and signal status.
- **IoT Integration**: Provides a simple REST endpoint for IoT devices to poll the current signal state.
- **Persistence**: Logs traffic cycle data to MongoDB (or a local JSON file as a fallback).

### Research Reference

The implementation is based on concepts from the paper: [PRR-MASC: A Priority-Rank-based Regulation for Multi-Agent Systems at Crossroads](https://arxiv.org/abs/2109.00937v2.pdf).

### How to Run

1.  **YOLO Model**: Ensure you have the `yolov8n.pt` model file in the `Backend/` directory, or specify the path in your `.env` file with the `MODEL_PATH` variable. If the model is not found, the system will automatically use the fallback detector.
2.  **Video Files**: Place your video files (`north.mp4`, `south.mp4`, `east.mp4`, `west.mp4`) in the `Backend/Videos/` directory.
3.  **Run Server**: Start the backend server as described in the main section of this README. The server will automatically start the PRR-MASC background loop.

### API Endpoints

-   `GET /lane/signal_state?intersectionId=<id>`: (Public) For IoT devices to poll the current state of traffic lights.
    ```bash
    curl "http://localhost:8000/lane/signal_state?intersectionId=INT-001"
    ```
-   `POST /lane/run_cycle`: (Protected: `employee`, `admin`) Manually triggers a new traffic cycle calculation.
    ```bash
    curl -X POST "http://localhost:8000/lane/run_cycle" -H "Authorization: Bearer <YOUR_TOKEN>"
    ```
-   `GET /lane/history?intersectionId=<id>&limit=<n>`: (Protected: `employee`, `admin`) Retrieves the last `n` traffic data records for an intersection.
-   `GET /lane/current_state?intersectionId=<id>`: (Protected: `employee`, `admin`) Gets the current in-memory state of the traffic cycle.
-   `WS /ws/lane_feed`: WebSocket endpoint for real-time updates. Connect to this endpoint to receive live data from the traffic control system.

### PyTorch/Ultralytics Compatibility

The system is designed to work with `ultralytics` and PyTorch. If you encounter compatibility issues, the system is designed to gracefully degrade to the OpenCV-based fallback detector, ensuring that the traffic control logic continues to function. Check the server logs on startup to see which detector is active.

# Backend Auth & RBAC Layer

This backend adds authentication (JWT) and role-based access control (RBAC) to the FastAPI app. It integrates cleanly with the existing features (traffic management, PRR-MASC, IoT) without altering their behavior. New routes are added under `/auth`, `/admin`, and example protected routes `/me`, `/employee/dashboard`.

Note: Design references were inspired by concepts in: /mnt/data/2109.00937v2.pdf (see paper for architectural notes).

## Environment
Create a `.env` in `Backend/` with at least:

- `SECRET_KEY=<your-secret>`
- `MONGODB_URI="mongodb+srv://..."` or `MONGO_URL="mongodb://localhost:27017/lanezy"`
- `FRONTEND_ORIGIN="http://localhost:5173"` (or your Vite dev URL)

Optional (for initial admin):
- `ADMIN_EMAIL=<admin@domain>`
- `ADMIN_PASSWORD=<strongpassword>`

Existing keys for Omnidim, email, etc., can remain.

## Run
Install dependencies and run the server from the `Backend` directory:

```
cd Backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints
- `POST /auth/signup` → create general user (role `user`)
- `POST /auth/login` → returns `{ access_token, token_type, user }`
- `POST /auth/signup_employee` → admin-only to create `employee`
- `GET /me` → returns current user info (requires Bearer token)
- `POST /admin/assign_employee` → `{intersectionId, employeeId}`
- `POST /admin/unassign_employee`
- `GET /admin/employees?intersectionId=...`

## Intersection Management Endpoints

- `POST /intersections/create` (admin only)
  - Creates a new intersection.
  - **Body**: 
    ```json
    {
      "intersectionId": "I002",
      "name": "2nd Ave & Main St",
      "coordinates": {"lat": 40.7128, "lon": -74.0060},
      "lanes": {
        "north": "cam_n_url",
        "south": "cam_s_url",
        "east": "cam_e_url",
        "west": "cam_w_url"
      }
    }
    ```
  - **cURL**:
    ```bash
    curl -X POST "http://localhost:8000/intersections/create" -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"intersectionId": "I002", "name": "2nd Ave & Main St", "coordinates": {"lat": 40.7128, "lon": -74.0060}, "lanes": {"north": "cam_n_url", "south": "cam_s_url", "east": "cam_e_url", "west": "cam_w_url"}}'
    ```

- `GET /intersections/{intersectionId}` (admin/assigned employee)
  - Retrieves details for a specific intersection.
  - **cURL**:
    ```bash
    curl -X GET "http://localhost:8000/intersections/I001" -H "Authorization: Bearer <TOKEN>"
    ```

- `GET /intersections` (admin only)
  - Lists all intersections with pagination.
  - **cURL**:
    ```bash
    curl -X GET "http://localhost:8000/intersections?skip=0&limit=10" -H "Authorization: Bearer <ADMIN_TOKEN>"
    ```

- `POST /intersections/{intersectionId}/assign_employee` (admin only)
  - Assigns an employee to an intersection.
  - **Body**: `{"employee_id": "employee_user_id"}`
  - **cURL**:
    ```bash
    curl -X POST "http://localhost:8000/intersections/I001/assign_employee" -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"employee_id": "some_employee_id"}'
    ```

- `POST /intersections/{intersectionId}/unassign_employee` (admin only)
  - Unassigns an employee from an intersection.
  - **Body**: `{"employee_id": "employee_user_id"}`
  - **cURL**:
    ```bash
    curl -X POST "http://localhost:8000/intersections/I001/unassign_employee" -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"employee_id": "some_employee_id"}'
    ```

- `POST /intersections/{intersectionId}/register_device` (admin only)
  - Registers an IoT device to an intersection.
  - **Body**: `{"iot_device_id": "device_id_123"}`
  - **cURL**:
    ```bash
    curl -X POST "http://localhost:8000/intersections/I001/register_device" -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"iot_device_id": "device_id_123"}'
    ```

- `GET /intersections/{intersectionId}/device`
  - Gets the IoT device ID and current signal state for an intersection.
  - **cURL**:
    ```bash
    curl -X GET "http://localhost:8000/intersections/I001/device" -H "Authorization: Bearer <TOKEN>"
    ```

- `GET /intersections/assigned` (employee/admin)
  - For employees, returns their assigned intersections. For admins, returns all intersections.
  - **cURL**:
    ```bash
    curl -X GET "http://localhost:8000/intersections/assigned" -H "Authorization: Bearer <TOKEN>"
    ```

Use header: `Authorization: Bearer <token>`.

## Create an Admin
Use the helper script (reads env or prompts). Run from `Backend` directory:

```
python scripts/create_admin.py
```

Or insert directly into DB with role `admin` and a bcrypt-hashed password.

## Notes
- Passwords hashed with `passlib[bcrypt]`.
- JWT signed with HS256 using `SECRET_KEY`, default expiry 24h.
- Future PRR-MASC and IoT routes should be protected with `require_role(["employee","admin"])` from `Backend.deps.auth_deps`.
