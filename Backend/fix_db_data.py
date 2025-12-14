from pymongo import MongoClient
import certifi
import datetime
import time

MONGO_URL = "mongodb+srv://dhruvsh5467:5aq9GQKwrwvJszSL@book-store.tmdjw.mongodb.net/lanezy?appName=Book-Store"

# Use certifi CA bundle so that TLS certificate verification succeeds
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client["lanezy"]
intersections = db["intersections"]

print("Scanning intersections for missing fields or invalid types...")

for doc in intersections.find():
    print(f"Checking intersection: {doc.get('intersectionId', 'UNKNOWN')} ({doc.get('_id')})")
    updates = {}
    
    if "name" not in doc:
        print(" - Missing 'name'")
        updates["name"] = "Main St & 1st Ave"
    
    if "coordinates" not in doc:
        print(" - Missing 'coordinates'")
        updates["coordinates"] = {"lat": 28.612091, "lon": 77.037639}
        
    if "lanes" not in doc:
        print(" - Missing 'lanes'")
        updates["lanes"] = {
            "north": "1.mp4",
            "south": "2.mp4",
            "east": "3.mp4",
            "west": "4.mp4"
        }
        
    if isinstance(doc.get("createdAt"), datetime.datetime):
        print(" - Converting 'createdAt' from datetime to int")
        updates["createdAt"] = int(doc["createdAt"].timestamp())
    elif "createdAt" not in doc:
         updates["createdAt"] = int(time.time())

    if isinstance(doc.get("updatedAt"), datetime.datetime):
        print(" - Converting 'updatedAt' from datetime to int")
        updates["updatedAt"] = int(doc["updatedAt"].timestamp())
    elif "updatedAt" not in doc:
         updates["updatedAt"] = int(time.time())
        
    if updates:
        print(f"Applying updates to {doc.get('_id')}...")
        intersections.update_one({"_id": doc["_id"]}, {"$set": updates})
        print("Update complete.")
    else:
        print("No updates needed.")

print("Done.")
