from math import radians, cos, sin, asin, sqrt
from datetime import datetime


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two lat/lon points using Haversine."""
    R = 6371000  # Earth radius in meters
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return R * c


def grid_bucket(lat: float, lon: float, resolution: float = 0.00045):
    """Compute 50m-like grid bucket using given resolution.
    Returns (gridId, base_lat, base_lon, gridLat, gridLon)
    """
    gridLat = round(lat / resolution)
    gridLon = round(lon / resolution)
    gridId = f"{gridLat}_{gridLon}"
    base_lat = gridLat * resolution
    base_lon = gridLon * resolution
    return gridId, base_lat, base_lon, gridLat, gridLon
