from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from bson import ObjectId

class TrafficData(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    intersectionId: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    lane_counts: Dict[str, int]
    densityScore: Optional[float] = None
    source: str
    rawData: Optional[Dict] = None
    priority_order: List[str]
    durations: Dict[str, int]
    ages: Dict[str, int]
    signalStatus: Optional[Dict[str, str]] = None
    frames_meta: Optional[Dict] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }
