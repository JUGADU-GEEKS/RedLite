from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from bson import ObjectId


class PotholeReportEntry(BaseModel):
    source: Literal["citizen", "iot"]
    lat: float
    lon: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PotholeRecord(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    gridId: str
    lat: float
    lon: float
    potholeCount: int = 0
    latestReportTime: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["pending", "resolved"] = "pending"
    reports: List[PotholeReportEntry] = []

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            ObjectId: lambda oid: str(oid)
        }
