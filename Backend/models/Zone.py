from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ZoneType(str, Enum):
    NO_PARKING = "NO_PARKING"
    BUS_LANE = "BUS_LANE"
    FOOTPATH = "FOOTPATH"
    LOADING_ZONE = "LOADING_ZONE"

class Zone(BaseModel):
    _id: Optional[str] = None
    zoneId: str = Field(..., description="Unique zone identifier")
    cameraId: str = Field(..., description="Camera identifier this zone belongs to")
    type: ZoneType = Field(..., description="Type of zone")
    polygon: List[List[float]] = Field(..., description="List of [x, y] coordinates forming the polygon")
    illegalInside: bool = Field(default=True, description="If true, vehicles inside are illegal")
    createdBy: Optional[str] = Field(None, description="User ID who created this zone")
    updatedBy: Optional[str] = Field(None, description="User ID who last updated this zone")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "zoneId": "ZONE-001",
                "cameraId": "CAM-001",
                "type": "NO_PARKING",
                "polygon": [[100, 100], [200, 100], [200, 200], [100, 200]],
                "illegalInside": True,
                "createdBy": "USER-001"
            }
        }

