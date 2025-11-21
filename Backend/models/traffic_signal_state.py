from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime
from bson import ObjectId

class TrafficSignalState(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    intersectionId: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    state: Dict[str, str] # e.g., {"north": "red", "south": "green"}
    currentLane: Optional[str] = None
    remainingTime: Optional[int] = None
    phase: Optional[str] = None # "green" or "yellow"

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }
