from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class IllegalSide(str, Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BOTH = "BOTH"

class BoundaryLine(BaseModel):
    _id: Optional[str] = None
    lineId: str = Field(..., description="Unique boundary line identifier")
    cameraId: str = Field(..., description="Camera identifier this line belongs to")
    points: List[List[float]] = Field(..., description="Two points [[x1, y1], [x2, y2]] defining the line")
    illegalSide: IllegalSide = Field(..., description="Which side of the line is illegal")
    lineName: Optional[str] = Field(None, description="Optional name for this boundary line")
    createdBy: Optional[str] = Field(None, description="User ID who created this line")
    updatedBy: Optional[str] = Field(None, description="User ID who last updated this line")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "lineId": "LINE-001",
                "cameraId": "CAM-001",
                "points": [[100, 100], [300, 100]],
                "illegalSide": "LEFT",
                "lineName": "Main Street Boundary"
            }
        }

