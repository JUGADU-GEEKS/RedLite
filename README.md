#  Smart Traffic Control System

A 4-lane intelligent traffic management system using computer vision and IoT to detect traffic density and dynamically control signal lights. Built using YOLOv5 (OpenCV), FastAPI, Node.js, React, and Arduino (Wi-Fi).

Live Link : https://lanezy.vercel.app/
---

##  Objective

To create a smart system that:
- Analyzes traffic density through live camera feeds.
- Decides which lane should get the green signal based on vehicle count.
- Ensures **no conflicting signals** (e.g., perpendicular lanes are never green together).
- Sends the signal update to **Arduino** which controls LEDs representing traffic lights.

---
## Screenshots
**Main Interface:**
![Main UI](Frontend/src/assets/1.png)

**Detection Page:**
![Price Result](Frontend/src/assets/2.png)


## Core Logic Flow

1. **Live Video Input**  
   Government provides live video feeds or pre-recorded videos from 4 directions (lanes).

2. **Vehicle Detection (YOLO + OpenCV)**  
   - Each video is processed individually to count vehicles using YOLOv5.
   - Frames are sent to a **FastAPI** backend for real-time inference.

3. **Traffic Logic Controller (Node.js)**  
   - Gets vehicle counts from FastAPI.
   - Applies logic to decide which lane gets green.
   - Ensures only **one lane** is green at a time.
   - Priority is based on density and timing rotation.

4. **Signal Update to Arduino**  
   - Sends control signals to Arduino via Wi-Fi (ESP8266).
   - Arduino turns on respective LEDs for the selected lane.

5. **Frontend Display (React)**  
   - Shows current signal status, vehicle counts, and lane camera feed.
   - Admin can also override in case of emergency.

---

## Tech Stack

- **Frontend:** React.js
- **Backend (AI):** FastAPI + YOLOv5 + OpenCV
- **Traffic Logic Middleware:** Node.js + Express
- **Microcontroller:** Arduino UNO + ESP8266 Wi-Fi
- **Communication:** HTTP/WebSocket (Arduino ⇄ Node)

---

##  Basic Setup (for Team)

### 1. FastAPI + YOLO (backend)
- Use `ultralytics/yolov5`
- Create a FastAPI endpoint that accepts frames and returns vehicle count

### 2. Node.js (logic controller)
- Polls the FastAPI endpoint every few seconds
- Maintains state of all 4 lanes
- Sends new signal status to Arduino via HTTP or socket

### 3. Arduino + LEDs
- Receives data over Wi-Fi
- Turns ON/OFF LEDs based on the input

### 4. React Frontend
- Shows current signal lane (green), camera previews, and vehicle counts

---

## 🔁 Traffic Logic (Core Rules)

- Only **1 lane** can have a green signal at any given time
- Basic priority logic:
  ```js
  if (laneA > laneB && laneA > laneC && laneA > laneD) {
      green = A
  }
