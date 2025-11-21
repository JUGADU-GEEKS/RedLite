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

# --- PRR-MASC Configuration ---
# Reference: /mnt/data/2109.00937v2.pdf
MODEL_PATH: str = os.getenv("MODEL_PATH", "yolov8n.pt")
VIDEOS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Videos')
LANES: list[str] = ["north", "south", "east", "west"]
LANE_VIDEO_MAP: dict[str, str] = {
    'north': '1.mp4',
    'south': '2.mp4',
    'east': '3.mp4',
    'west': '4.mp4',
}
DURATIONS_BY_RANK: list[int] = [45, 30, 15, 15]
YELLOW_TIME: int = 3
DEFAULT_INTERSECTION_ID: str = "INT-001"
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

def get_access_token_expires() -> timedelta:
    return timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
