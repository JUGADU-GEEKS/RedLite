from pymongo import MongoClient
import certifi
from core.config import MONGO_URL

# Use certifi CA bundle
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client.get_database()

# This collection will store the state of active overrides
# It will act as a shared memory between different server processes
override_collection = db["emergency_overrides"]

# Create a TTL (Time-To-Live) index on the 'expiresAt' field.
# MongoDB will automatically delete documents from this collection
# 'expireAfterSeconds' seconds after the 'expiresAt' time.
# This is a robust way to automatically clean up stale locks.
override_collection.create_index("expiresAt", expireAfterSeconds=0)
