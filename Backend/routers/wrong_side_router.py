from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import JSONResponse
import shutil
import os
from services.wrong_side_service import WrongSideService

router = APIRouter()

def get_wrong_side_service():
    return WrongSideService()

@router.post("/wrong-side")
async def wrong_side_detection(
    video: UploadFile = File(...),
    service: WrongSideService = Depends(get_wrong_side_service)
):
    # Save the uploaded video file
    video_path = f"temp_{video.filename}"
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # Process the video to detect wrong side vehicles and plates
    detected_plates = await service.process_video(video_path)

    # Clean up the temporary video file
    os.remove(video_path)

    return JSONResponse(content={
        "message": "Wrong side detection completed.",
        "detected_plates": detected_plates
    })
