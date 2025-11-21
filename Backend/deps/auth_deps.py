from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from core.config import MONGO_URL
from services.auth_service import decode_access_token


_client: Optional[AsyncIOMotorClient] = None


async def get_db() -> AsyncIOMotorDatabase:
    global _client
    if _client is None:
        if not MONGO_URL:
            raise RuntimeError("MONGO_URL/MONGODB_URI not configured")
        _client = AsyncIOMotorClient(MONGO_URL)
    # Database name from URL or default 'lanezy'
    default_db = _client.get_default_database()
    db_name = default_db.name if default_db is not None else "lanezy"
    return _client[db_name]


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth scheme")
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("userId")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = await db.users.find_one({"userId": user_id, "email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(required_roles: List[str]):
    async def checker(current_user=Depends(get_current_user)):
        role = current_user.get("role")
        if role not in required_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: insufficient role")
        return current_user

    return checker
