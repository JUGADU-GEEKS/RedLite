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
            "phone": "+91-90000-00001",
            "ambulanceInfo": {
                "driverLicense": "DL-OD-TEST-001",
                "vehicleId": "AMB-001",
                "vehiclePlate": "DL01AA0001",
                "agency": "City Hospital A",
                "authorized": True
            }
        },
        {
            "userId": "AMB-USER-002",
            "name": "Demo Driver 2",
            "email": "amb2@example.com",
            "password": "password123",
            "role": "ambulance_driver",
            "phone": "+91-90000-00002",
            "ambulanceInfo": {
                "driverLicense": "DL-OD-TEST-002",
                "vehicleId": "AMB-002",
                "vehiclePlate": "DL01AA0002",
                "agency": "City Hospital B",
                "authorized": True
            }
        },
        {
            "userId": "AMB-USER-003",
            "name": "Laptop Demo Driver",
            "email": "amb-demo@lanezy.dev",
            "password": "lanezy-demo",
            "role": "ambulance_driver",
            "phone": "+91-90000-00003",
            "ambulanceInfo": {
                "driverLicense": "DL-OD-TEST-003",
                "vehicleId": "AMB-LAPTOP",
                "vehiclePlate": "DL01AA0099",
                "agency": "Lanezy Demo Fleet",
                "authorized": True
            }
        }
    ]

    for user_data in dummy_users:
        now = datetime.utcnow()
        set_data = {
            "userId": user_data["userId"],
            "email": user_data["email"],
            "password_hash": hash_password(user_data["password"]),
            "name": user_data["name"],
            "role": user_data["role"],
            "phone": user_data.get("phone"),
            "ambulanceInfo": user_data["ambulanceInfo"],
            "updatedAt": now,
        }
        set_on_insert = {
            "createdAt": now,
            "assignedIntersections": []
        }

        result = await users_collection.update_one(
            {"email": user_data["email"]},
            {"$set": set_data, "$setOnInsert": set_on_insert},
            upsert=True
        )

        if result.upserted_id:
            print(f"Created user: {user_data['email']} (Password: {user_data['password']})")
        elif result.modified_count > 0:
            print(f"Refreshed user: {user_data['email']} (Password reset to {user_data['password']})")
        else:
            print(f"No changes needed for {user_data['email']}")

    print("Dummy ambulance drivers creation complete.")

if __name__ == "__main__":
    asyncio.run(create_dummy_ambulances())
