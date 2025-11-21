import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from core.config import get_access_token_expires
from deps.auth_deps import get_current_user, get_db
from models.user import UserIn, UserPublic
from services.auth_service import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup", response_model=UserPublic)
async def signup(payload: UserIn, db=Depends(get_db)):
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.utcnow()
    user_doc = {
        "userId": f"USER-{uuid.uuid4().hex[:8].upper()}",
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role or "user",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(user_doc)
    return UserPublic(**{
        "userId": user_doc["userId"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc["role"],
        "assignedIntersections": user_doc["assignedIntersections"],
    })


@router.post("/login")
async def login(payload: LoginIn, db=Depends(get_db)):
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={
            "sub": user["userId"],
            "userId": user["userId"],
            "email": user["email"],
            "role": user.get("role", "user"),
        },
        expires_delta=get_access_token_expires(),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "userId": user["userId"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "user"),
            "assignedIntersections": user.get("assignedIntersections", []),
        },
    }


@router.post("/signup_employee", response_model=UserPublic)
async def signup_employee(
    payload: UserIn,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.utcnow()
    user_doc = {
        "userId": f"EMP-{uuid.uuid4().hex[:8].upper()}",
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "employee",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(user_doc)
    return UserPublic(**{
        "userId": user_doc["userId"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc["role"],
        "assignedIntersections": user_doc["assignedIntersections"],
    })
