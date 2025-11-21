from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class TrafficData(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    intersectionId: str
    timestamp: float
    lane_counts: Dict[str, int]
    densityScore: float = 0.0
    source: str = "yolo"  # or "fallback"
    rawData: Optional[Any] = None
    priority_order: List[str]
    durations: Dict[str, int]
    ages: Dict[str, int]
    signalStatus: Optional[Dict[str, str]] = None
    frames_meta: Optional[Dict[str, str]] = None  # e.g. frame hashes or small metadata
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
