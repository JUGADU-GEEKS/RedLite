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


# PRR-MASC specific settings
# This implementation is based on the research paper: https://arxiv.org/abs/2109.00937
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")
# Resolve VIDEOS_DIR relative to this file's location (core/config.py -> Backend/Videos)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Backend directory
VIDEOS_DIR = os.getenv("VIDEOS_DIR", os.path.join(_BASE_DIR, "Videos"))
LANES = ["north", "south", "east", "west"]
LANE_VIDEO_MAP = {
    "north": "1.mp4",
    "south": "2.mp4",
    "east": "3.mp4",
    "west": "4.mp4",
}
DURATIONS_BY_RANK = [45, 30, 15, 15]
YELLOW_TIME = 3
DEFAULT_INTERSECTION_ID = os.getenv("DEFAULT_INTERSECTION_ID", "INT-001")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Emergency Override Settings
EMERGENCY_OVERRIDE_DURATION = int(os.getenv("EMERGENCY_OVERRIDE_DURATION", "30"))  # seconds
EMERGENCY_HEARTBEAT_TIMEOUT = int(os.getenv("EMERGENCY_HEARTBEAT_TIMEOUT", "10"))  # seconds
EMERGENCY_CLEAR_DISTANCE = int(os.getenv("EMERGENCY_CLEAR_DISTANCE", "100"))  # meters
EMERGENCY_SEARCH_RADIUS = int(os.getenv("EMERGENCY_SEARCH_RADIUS", "3000"))  # meters
EMERGENCY_APPROACH_ANGLE = int(os.getenv("EMERGENCY_APPROACH_ANGLE", "45"))  # degrees

