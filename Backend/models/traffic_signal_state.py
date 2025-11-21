from typing import Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class TrafficSignalState(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    intersectionId: str
    timestamp: float
    state: Dict[str, str]  # e.g. {"north": "red", "south": "green", ...}
    currentLane: Optional[str]
    remainingTime: int
    phase: str  # "green", "yellow", "red"
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
