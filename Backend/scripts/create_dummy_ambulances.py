import asyncio
import os
import sys
from datetime import datetime

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import MONGO_URL
from services.auth_service import hash_password

async def create_dummy_ambulances():
    print(f"Connecting to MongoDB at {MONGO_URL}...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.get_database("lanezy") # Explicitly use lanezy db
    users_collection = db["users"]

    dummy_users = [
        {
            "userId": "AMB-USER-001",
            "name": "Demo Driver 1",
            "email": "amb1@example.com",
            "password": "password123",
            "role": "ambulance_driver",
            "ambulanceInfo": {
                "driverLicense": "DL-OD-TEST-001",
                "vehicleId": "AMB-001",
                "authorized": True
            }
        },
        {
            "userId": "AMB-USER-002",
            "name": "Demo Driver 2",
            "email": "amb2@example.com",
            "password": "password123",
            "role": "ambulance_driver",
            "ambulanceInfo": {
                "driverLicense": "DL-OD-TEST-002",
                "vehicleId": "AMB-002",
                "authorized": True
            }
        }
    ]

    for user_data in dummy_users:
        existing = await users_collection.find_one({"email": user_data["email"]})
        if existing:
            print(f"User {user_data['email']} already exists. Skipping.")
            continue

        now = datetime.utcnow()
        user_doc = {
            "userId": user_data["userId"],
            "email": user_data["email"],
            "password_hash": hash_password(user_data["password"]),
            "name": user_data["name"],
            "role": user_data["role"],
            "assignedIntersections": [],
            "ambulanceInfo": user_data["ambulanceInfo"],
            "createdAt": now,
            "updatedAt": now,
        }
        
        await users_collection.insert_one(user_doc)
        print(f"Created user: {user_data['email']} (Password: {user_data['password']})")

    print("Dummy ambulance drivers creation complete.")

if __name__ == "__main__":
    asyncio.run(create_dummy_ambulances())
