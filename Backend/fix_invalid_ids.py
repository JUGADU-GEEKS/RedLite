from pymongo import MongoClient
import certifi
from bson import ObjectId

MONGO_URL = "mongodb+srv://dhruvsh5467:5aq9GQKwrwvJszSL@book-store.tmdjw.mongodb.net/lanezy?appName=Book-Store"

# Use certifi CA bundle so that TLS certificate verification succeeds
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client["lanezy"]
intersections = db["intersections"]

print("Scanning for documents with invalid _id...")

# Find documents where _id is a string (likely empty string based on the error)
# Note: In MongoDB, _id can be of any type, but usually it's ObjectId.
# We are looking for cases where it is NOT an ObjectId.
# However, querying for type might be complex if we just want to catch the empty string case seen in the screenshot.
# Let's iterate and check.

count = 0
for doc in intersections.find():
    doc_id = doc["_id"]
    if not isinstance(doc_id, ObjectId):
        print(f"Found invalid _id: {repr(doc_id)} for intersection: {doc.get('intersectionId')}")
        
        # Create a new document with a valid ObjectId
        new_doc = doc.copy()
        new_doc["_id"] = ObjectId() # Generate new ObjectId
        
        try:
            # Insert the new document
            intersections.insert_one(new_doc)
            print(f" - Inserted copy with new _id: {new_doc['_id']}")
            
            # Delete the old document
            intersections.delete_one({"_id": doc_id})
            print(f" - Deleted original document with invalid _id")
            count += 1
        except Exception as e:
            print(f" - Error fixing document: {e}")

if count == 0:
    print("No invalid _id found.")
else:
    print(f"Fixed {count} documents.")
