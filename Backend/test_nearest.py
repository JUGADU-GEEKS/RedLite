import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from services.emergency_service import find_nearest_intersection_ahead

# Simulation coordinates from AmbulanceDashboard.jsx
START_LAT = 28.4650
START_LON = 77.2097888
HEADING = 0

print(f"Testing find_nearest for: {START_LAT}, {START_LON}, Heading: {HEADING}")
result = find_nearest_intersection_ahead(START_LAT, START_LON, HEADING)
print("Result:", result)
