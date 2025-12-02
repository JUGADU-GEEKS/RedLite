from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Camera(BaseModel):
    _id: Optional[str] = None
    cameraId: str = Field(..., description="Unique camera identifier")
    name: str = Field(..., description="Camera name")
    streamUrl: Optional[str] = Field(None, description="Stream URL for live video")
    location: Optional[dict] = Field(None, description="Location coordinates {lat, lon}")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "cameraId": "CAM-001",
                "name": "Main Street Camera",
                "streamUrl": "rtsp://example.com/stream",
                "location": {"lat": 40.7128, "lon": -74.0060}
            }
        }

