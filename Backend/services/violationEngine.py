"""
Violation Engine - Core detection logic for illegal parking
Implements polygon point-in-polygon, boundary line side detection, and severity scoring
"""
from typing import List, Tuple, Optional, Dict
from models.Zone import Zone
from models.BoundaryLine import BoundaryLine, IllegalSide
import math

def point_in_polygon(point: List[float], polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point is inside a polygon.
    
    Args:
        point: [x, y] coordinates of the point
        polygon: List of [x, y] coordinates forming the polygon
        
    Returns:
        True if point is inside polygon, False otherwise
    """
    if len(polygon) < 3:
        return False
    
    x, y = point[0], point[1]
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside

def get_side_of_line(vehicle_point: List[float], line_points: List[List[float]]) -> str:
    """
    Determine which side of a line a vehicle is on using cross product.
    
    Args:
        vehicle_point: [x, y] coordinates of the vehicle (centroid)
        line_points: [[x1, y1], [x2, y2]] defining the line
        
    Returns:
        "LEFT", "RIGHT", or "ON_LINE"
    """
    if len(line_points) != 2:
        return "ON_LINE"
    
    x1, y1 = line_points[0]
    x2, y2 = line_points[1]
    vx, vy = vehicle_point[0], vehicle_point[1]
    
    # Vector from line start to end
    dx = x2 - x1
    dy = y2 - y1
    
    # Vector from line start to vehicle
    vdx = vx - x1
    vdy = vy - y1
    
    # Cross product: (dx, dy) x (vdx, vdy) = dx * vdy - dy * vdx
    cross_product = dx * vdy - dy * vdx
    
    if abs(cross_product) < 1e-6:  # Very small, consider on line
        return "ON_LINE"
    elif cross_product > 0:
        return "LEFT"
    else:
        return "RIGHT"

def check_zone_violation(vehicle_point: List[float], zone: Dict) -> bool:
    """
    Check if a vehicle violates a zone rule.
    
    Args:
        vehicle_point: [x, y] coordinates of the vehicle
        zone: Zone dictionary with polygon and illegalInside flag
        
    Returns:
        True if violation detected, False otherwise
    """
    if not zone.get("polygon"):
        return False
    
    is_inside = point_in_polygon(vehicle_point, zone["polygon"])
    illegal_inside = zone.get("illegalInside", True)
    
    # Violation if: (inside and illegalInside) OR (outside and not illegalInside)
    return is_inside == illegal_inside

def check_boundary_line_violation(vehicle_point: List[float], boundary_line: Dict) -> bool:
    """
    Check if a vehicle violates a boundary line rule.
    
    Args:
        vehicle_point: [x, y] coordinates of the vehicle
        boundary_line: BoundaryLine dictionary with points and illegalSide
        
    Returns:
        True if violation detected, False otherwise
    """
    if not boundary_line.get("points") or len(boundary_line["points"]) != 2:
        return False
    
    side = get_side_of_line(vehicle_point, boundary_line["points"])
    illegal_side = boundary_line.get("illegalSide", "LEFT")
    
    if side == "ON_LINE":
        # Consider on-line as violation if BOTH is illegal
        return illegal_side == "BOTH"
    
    # Check if vehicle is on the illegal side
    if illegal_side == "BOTH":
        return True
    elif illegal_side == "LEFT" and side == "LEFT":
        return True
    elif illegal_side == "RIGHT" and side == "RIGHT":
        return True
    
    return False

def calculate_severity_score(
    blocked_ratio: float,
    dwell_time: float,
    zone_type: Optional[str] = None,
    base_score: float = 50.0
) -> float:
    """
    Calculate severity score for a violation.
    
    Args:
        blocked_ratio: Ratio of blocked area (0.0 to 1.0)
        dwell_time: Time vehicle has been stationary (seconds)
        zone_type: Type of zone (NO_PARKING, BUS_LANE, etc.)
        base_score: Base score to start from
        
    Returns:
        Severity score from 0 to 100
    """
    # Base score
    score = base_score
    
    # Add blocked ratio component (0-30 points)
    score += blocked_ratio * 30
    
    # Add dwell time component (0-20 points)
    # More time = higher score, capped at 20
    time_component = min(dwell_time / 60.0, 1.0) * 20  # Normalize to 60 seconds
    score += time_component
    
    # Zone type multiplier
    type_multipliers = {
        "NO_PARKING": 1.0,
        "BUS_LANE": 1.2,
        "FOOTPATH": 1.5,
        "LOADING_ZONE": 0.8
    }
    if zone_type:
        multiplier = type_multipliers.get(zone_type, 1.0)
        score *= multiplier
    
    # Cap at 100
    return min(score, 100.0)

def detect_illegal_parking(
    vehicle_centroid: List[float],
    vehicle_bbox: Optional[List[float]] = None,  # [x1, y1, x2, y2]
    zones: List[Dict] = None,
    boundary_lines: List[Dict] = None,
    frame_width: int = 1920,
    frame_height: int = 1080
) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Main detection function - checks if a vehicle is illegally parked.
    
    Args:
        vehicle_centroid: [x, y] coordinates of vehicle centroid
        vehicle_bbox: Optional bounding box [x1, y1, x2, y2]
        zones: List of zone dictionaries to check
        boundary_lines: List of boundary line dictionaries to check
        frame_width: Frame width for blocked ratio calculation
        frame_height: Frame height for blocked ratio calculation
        
    Returns:
        Tuple of (is_violation, violation_source, violation_type)
        violation_source: zone or boundary_line dict if violation found
        violation_type: "zone" or "boundary_line"
    """
    if zones is None:
        zones = []
    if boundary_lines is None:
        boundary_lines = []
    
    # Check zones first
    for zone in zones:
        if check_zone_violation(vehicle_centroid, zone):
            return True, zone, "zone"
    
    # Check boundary lines
    for boundary_line in boundary_lines:
        if check_boundary_line_violation(vehicle_centroid, boundary_line):
            return True, boundary_line, "boundary_line"
    
    return False, None, None

def calculate_blocked_ratio(
    vehicle_bbox: List[float],
    frame_width: int,
    frame_height: int
) -> float:
    """
    Calculate the ratio of frame area blocked by vehicle.
    
    Args:
        vehicle_bbox: [x1, y1, x2, y2] bounding box
        frame_width: Frame width in pixels
        frame_height: Frame height in pixels
        
    Returns:
        Blocked ratio (0.0 to 1.0)
    """
    if not vehicle_bbox or len(vehicle_bbox) != 4:
        return 0.0
    
    x1, y1, x2, y2 = vehicle_bbox
    vehicle_area = (x2 - x1) * (y2 - y1)
    frame_area = frame_width * frame_height
    
    if frame_area == 0:
        return 0.0
    
    return vehicle_area / frame_area

def track_stationary_vehicle(
    vehicle_id: str,
    current_position: List[float],
    vehicle_tracks: Dict,
    stationary_threshold: float = 10.0,  # pixels
    time_threshold: float = 5.0  # seconds
) -> Tuple[bool, float]:
    """
    Track if a vehicle is stationary using centroid tracking.
    
    Args:
        vehicle_id: Unique identifier for the vehicle
        current_position: [x, y] current centroid position
        vehicle_tracks: Dictionary tracking vehicle positions over time
        stationary_threshold: Maximum movement to be considered stationary (pixels)
        time_threshold: Minimum time to be considered stationary (seconds)
        
    Returns:
        Tuple of (is_stationary, dwell_time)
    """
    import time
    
    current_time = time.time()
    
    if vehicle_id not in vehicle_tracks:
        vehicle_tracks[vehicle_id] = {
            "positions": [(current_position, current_time)],
            "first_seen": current_time
        }
        return False, 0.0
    
    track = vehicle_tracks[vehicle_id]
    last_position, last_time = track["positions"][-1]
    
    # Calculate distance moved
    dx = current_position[0] - last_position[0]
    dy = current_position[1] - last_position[1]
    distance = math.sqrt(dx * dx + dy * dy)
    
    # If moved significantly, reset tracking
    if distance > stationary_threshold:
        track["positions"] = [(current_position, current_time)]
        track["first_seen"] = current_time
        return False, 0.0
    
    # Add current position
    track["positions"].append((current_position, current_time))
    
    # Calculate dwell time
    dwell_time = current_time - track["first_seen"]
    
    # Check if stationary long enough
    is_stationary = dwell_time >= time_threshold
    
    return is_stationary, dwell_time

