import os
from datetime import timedelta
from typing import Optional

from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


SECRET_KEY: str = os.getenv("SECRET_KEY", os.getenv("JWT_SECRET", "change-me"))
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

# Default 1440 minutes (24 hours)
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

# Prefer MONGODB_URI if provided, fallback to MONGO_URL
MONGO_URL: Optional[str] = (
    os.getenv("MONGODB_URI")
    or os.getenv("MONGO_URL")
    or "mongodb://localhost:27017/lanezy"
)

FRONTEND_ORIGIN: Optional[str] = os.getenv("FRONTEND_ORIGIN")

def get_access_token_expires() -> timedelta:
    return timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
