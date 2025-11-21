
from pymongo import MongoClient
import os

# Use the connection string from your config or environment
MONGO_URL = "mongodb+srv://dhruvsh5467:5aq9GQKwrwvJszSL@book-store.tmdjw.mongodb.net/lanezy?appName=Book-Store"

client = MongoClient(MONGO_URL)
db = client["lanezy"]
intersections = db["intersections"]
users = db["users"]

user_email = "kunalsharma7003@gmail.com"
user = users.find_one({"email": user_email})

print(f"User found: {user}")

if user:
    user_id = user.get("userId")
    print(f"User ID: '{user_id}'")
    
    # Check for intersections
    query = {"assignedEmployees": user_id}
    print(f"Querying intersections with: {query}")
    
    assigned = list(intersections.find(query))
    print(f"Found {len(assigned)} intersections.")
    for i in assigned:
        print(f" - {i.get('intersectionId')}: {i.get('assignedEmployees')}")

    # Check if there is any whitespace in the array
    all_intersections = list(intersections.find())
    for i in all_intersections:
        if user_id in i.get("assignedEmployees", []):
            print(f"MATCH FOUND in manual scan: {i.get('intersectionId')}")
        else:
            # Check for partial matches or whitespace
            for emp in i.get("assignedEmployees", []):
                if user_id in emp or emp in user_id:
                    print(f"POTENTIAL MATCH (whitespace/partial): '{emp}' vs '{user_id}' in {i.get('intersectionId')}")

