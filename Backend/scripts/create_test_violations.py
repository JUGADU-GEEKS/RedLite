"""
Script to create test violations for the Illegal Parking Detection System
Run this to populate the database with sample violations for testing
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
import random

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import MONGO_URL
import certifi

async def create_test_violations():
    print(f"Connecting to MongoDB at {MONGO_URL}...")
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client.get_database("lanezy")
    violations_collection = db["violations"]

    # Sample violation data
    test_violations = [
        {
            "cameraId": "CAM-001",
            "zoneId": None,
            "lineId": None,
            "timestamp": datetime.utcnow() - timedelta(minutes=30),
            "plateNumber": "ABC1234",
            "severityScore": 75.5,
            "dwellTime": 120.0,
            "status": "pending",
            "vehicleImageUrl": None,
            "videoClipUrl": None,
            "createdAt": datetime.utcnow() - timedelta(minutes=30),
            "updatedAt": datetime.utcnow() - timedelta(minutes=30)
        },
        {
            "cameraId": "CAM-001",
            "zoneId": "ZONE-001",
            "lineId": None,
            "timestamp": datetime.utcnow() - timedelta(minutes=15),
            "plateNumber": "XYZ5678",
            "severityScore": 85.2,
            "dwellTime": 180.0,
            "status": "pending",
            "vehicleImageUrl": None,
            "videoClipUrl": None,
            "createdAt": datetime.utcnow() - timedelta(minutes=15),
            "updatedAt": datetime.utcnow() - timedelta(minutes=15)
        },
        {
            "cameraId": "CAM-002",
            "zoneId": None,
            "lineId": "LINE-001",
            "timestamp": datetime.utcnow() - timedelta(minutes=5),
            "plateNumber": "DEF9012",
            "severityScore": 65.8,
            "dwellTime": 90.0,
            "status": "approved",
            "vehicleImageUrl": None,
            "videoClipUrl": None,
            "createdAt": datetime.utcnow() - timedelta(minutes=5),
            "updatedAt": datetime.utcnow() - timedelta(minutes=5)
        },
        {
            "cameraId": "CAM-003",
            "zoneId": None,
            "lineId": None,
            "timestamp": datetime.utcnow() - timedelta(minutes=2),
            "plateNumber": "GHI3456",
            "severityScore": 92.3,
            "dwellTime": 240.0,
            "status": "pending",
            "vehicleImageUrl": None,
            "videoClipUrl": None,
            "createdAt": datetime.utcnow() - timedelta(minutes=2),
            "updatedAt": datetime.utcnow() - timedelta(minutes=2)
        }
    ]

    print(f"\nCreating {len(test_violations)} test violations...")
    
    for i, violation in enumerate(test_violations, 1):
        result = await violations_collection.insert_one(violation)
        print(f"✓ Created violation {i}/{len(test_violations)}: {violation['plateNumber']} (Status: {violation['status']})")

    print(f"\n✅ Successfully created {len(test_violations)} test violations!")
    print("\nYou can now view these violations in the Illegal Parking Dashboard:")
    print("1. Go to the Illegal Parking page")
    print("2. Click on the 'Violations' tab")
    print("3. You should see the test violations listed")

if __name__ == "__main__":
    asyncio.run(create_test_violations())

