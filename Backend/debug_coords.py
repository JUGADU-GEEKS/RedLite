import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Backend'))
from services.intersection_service import get_all_intersections

intersections = get_all_intersections()
for i in intersections:
    print(f"ID: {i.get('intersectionId')}, Name: {i.get('name')}, Coords: {i.get('coordinates')}")
