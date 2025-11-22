from pydantic import BaseModel, Field
from datetime import datetime

class WrongSideVehicle(BaseModel):
    plate_number: str
    timestamp: datetime = Field(default_factory=datetime.now)
    video_file: str
