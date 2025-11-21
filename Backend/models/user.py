from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = Field(default="user", pattern="^(user|employee|admin)$")


class UserPublic(BaseModel):
    userId: str
    email: EmailStr
    name: str
    role: str
    assignedIntersections: List[str] = []


class User(UserPublic):
    pass


class UserDB(BaseModel):
    _id: Optional[str] = None
    userId: str
    email: EmailStr
    password_hash: str
    name: str
    role: str = Field(pattern="^(user|employee|admin)$")
    assignedIntersections: List[str] = []
    createdAt: datetime
    updatedAt: datetime
