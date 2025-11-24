from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class AmbulanceInfo(BaseModel):
    driverLicense: str
    vehicleId: str
    authorized: bool = False


class UserIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = Field(default="user", pattern="^(user|employee|admin|ambulance_driver)$")
    ambulanceInfo: Optional[AmbulanceInfo] = None


class UserPublic(BaseModel):
    userId: str
    email: EmailStr
    name: str
    role: str
    assignedIntersections: List[str] = []
    ambulanceInfo: Optional[AmbulanceInfo] = None


class User(UserPublic):
    pass


class UserDB(BaseModel):
    _id: Optional[str] = None
    userId: str
    email: EmailStr
    password_hash: str
    name: str
    role: str = Field(pattern="^(user|employee|admin|ambulance_driver)$")
    assignedIntersections: List[str] = []
    ambulanceInfo: Optional[AmbulanceInfo] = None
    createdAt: datetime
    updatedAt: datetime
