from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class ViolationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_ESCALATED = "auto-escalated"

class Violation(BaseModel):
    _id: Optional[str] = None
    cameraId: str = Field(..., description="Camera identifier where violation occurred")
    zoneId: Optional[str] = Field(None, description="Zone ID if violation is zone-based")
    lineId: Optional[str] = Field(None, description="Boundary line ID if violation is line-based")
    timestamp: datetime = Field(..., description="When the violation occurred")
    vehicleImageUrl: Optional[str] = Field(None, description="URL to the vehicle image")
    videoClipUrl: Optional[str] = Field(None, description="URL to the video clip")
    plateNumber: Optional[str] = Field(None, description="Detected license plate number")
    severityScore: float = Field(default=0.0, description="Severity score (0-100)")
    dwellTime: float = Field(default=0.0, description="Time vehicle was stationary (seconds)")
    status: ViolationStatus = Field(default=ViolationStatus.PENDING, description="Violation status")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "cameraId": "CAM-001",
                "zoneId": "ZONE-001",
                "timestamp": "2024-01-15T10:30:00Z",
                "plateNumber": "ABC123",
                "severityScore": 75.5,
                "dwellTime": 120.0,
                "status": "pending"
            }
        }

