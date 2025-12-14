import asyncio
from datetime import datetime
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from core.config import MONGO_URL
from services.auth_service import hash_password


load_dotenv()


async def main():
    email = os.getenv("ADMIN_EMAIL") or input("Admin email: ")
    password = os.getenv("ADMIN_PASSWORD") or input("Admin password: ")
    name = os.getenv("ADMIN_NAME", "Administrator")

    client = AsyncIOMotorClient(MONGO_URL)
    default_db = client.get_default_database()
    db_name = default_db.name if default_db is not None else "lanezy"
    db = client[db_name]

    exists = await db.users.find_one({"email": email})
    if exists:
        print("Admin already exists")
        return

    now = datetime.utcnow()
    doc = {
        "userId": "ADMIN-" + now.strftime("%H%M%S"),
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "role": "admin",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(doc)
    print(f"Created admin: {email}")


if __name__ == "__main__":
    asyncio.run(main())
