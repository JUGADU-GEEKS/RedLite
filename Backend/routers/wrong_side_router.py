from fastapi import APIRouter, UploadFile, File, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import shutil
import os
from services.wrong_side_service import WrongSideService

router = APIRouter()

def get_wrong_side_service():
    return WrongSideService()

@router.post("/wrong-side/upload")
async def upload_wrong_side_video(
    video: UploadFile = File(...)
):
    # Save the uploaded video file
    # Ensure the temp directory exists
    os.makedirs("temp_uploads", exist_ok=True)
    video_path = os.path.join("temp_uploads", f"temp_{video.filename}")
    
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    return JSONResponse(content={
        "message": "Video uploaded successfully",
        "filename": video.filename,
        "temp_path": video_path
    })

@router.websocket("/ws/wrong-side/{filename}")
async def wrong_side_websocket(websocket: WebSocket, filename: str):
    await websocket.accept()
    
    # Construct path (matching the upload logic)
    video_path = os.path.join("temp_uploads", f"temp_{filename}")
    
    if not os.path.exists(video_path):
        await websocket.close(code=1000, reason="File not found")
        return

    service = WrongSideService()
    
    try:
        # Process and stream
        await service.process_video(video_path, websocket=websocket)
        
        # Send completion message
        await websocket.send_json({"status": "complete"})
        
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in websocket: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        # Clean up
        if os.path.exists(video_path):
            os.remove(video_path)
        try:
            await websocket.close()
        except:
            pass
