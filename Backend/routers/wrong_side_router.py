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
    
    video_path = None
    is_temp = False
    
    try:
        # Check if it's the static demo file
        if filename == "wrongside.mp4" or filename.endswith(".mp4"):
            # Look in Backend/Videos
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            video_path = os.path.join(base_dir, "Videos", filename)
            # Normalize path for Windows compatibility
            video_path = os.path.normpath(video_path)
            is_temp = False
            
            # If not found, try alternative location
            if not os.path.exists(video_path):
                alt_path = os.path.join(base_dir, "Videos", "wrongside.mp4")
                alt_path = os.path.normpath(alt_path)
                if os.path.exists(alt_path):
                    video_path = alt_path
        else:
            # Construct path (matching the upload logic)
            video_path = os.path.join("temp_uploads", f"temp_{filename}")
            video_path = os.path.normpath(video_path)
            is_temp = True
        
        if not os.path.exists(video_path):
            error_msg = f"Video file not found: {video_path}"
            print(f"[WrongSide] {error_msg}")
            try:
                await websocket.send_json({"error": error_msg, "status": "error"})
            except:
                pass
            await websocket.close(code=1000, reason="File not found")
            return

        print(f"[WrongSide] Processing video: {video_path}")
        service = WrongSideService()
        
        # Process and stream
        await service.process_video(video_path, websocket=websocket)
        
        # Send completion message
        try:
            await websocket.send_json({"status": "complete"})
        except:
            pass
        
    except WebSocketDisconnect:
        print("[WrongSide] Client disconnected")
    except Exception as e:
        error_msg = f"Error processing video: {str(e)}"
        print(f"[WrongSide] {error_msg}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({"error": error_msg, "status": "error"})
        except:
            pass
    finally:
        # Clean up only if it was a temp file
        if is_temp and video_path and os.path.exists(video_path):
            try:
                os.remove(video_path)
                print(f"[WrongSide] Cleaned up temp file: {video_path}")
            except Exception as e:
                print(f"[WrongSide] Error cleaning up temp file: {e}")
        try:
            await websocket.close()
        except:
            pass
