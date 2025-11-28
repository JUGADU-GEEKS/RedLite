from PIL import Image, ExifTags
from datetime import datetime
from typing import Optional, Tuple
import io


def _convert_to_degrees(value):
    # value is a tuple of rational numbers (num, den)
    try:
        d = float(value[0][0]) / float(value[0][1])
        m = float(value[1][0]) / float(value[1][1])
        s = float(value[2][0]) / float(value[2][1])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return None


def extract_exif_gps_and_time(image_bytes: bytes) -> Optional[Tuple[float, float, datetime]]:
    """Extract GPS latitude, longitude and original timestamp from image bytes.
    Returns tuple (lat, lon, datetime) or None if GPS or time missing.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif = img._getexif() or {}
    except Exception:
        return None

    # Map EXIF tag ids to names
    tag_map = {}
    for k, v in ExifTags.TAGS.items():
        tag_map[k] = v

    gps_info = None
    gps_tag = None
    datetime_original = None

    for tag_id, value in (exif.items() if isinstance(exif, dict) else []):
        tag = tag_map.get(tag_id, tag_id)
        if tag == 'GPSInfo':
            gps_info = value
        if tag in ('DateTimeOriginal', 'DateTime') and not datetime_original:
            try:
                # EXIF date format: 'YYYY:MM:DD HH:MM:SS'
                datetime_original = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
            except Exception:
                try:
                    datetime_original = datetime.fromisoformat(value)
                except Exception:
                    datetime_original = None

    if not gps_info:
        return None

    # GPS tags can be numeric keys or named keys
    # Normalize gps_info to a dict with human keys if available
    gps_data = {}
    for key in gps_info:
        name = ExifTags.GPSTAGS.get(key, key)
        gps_data[name] = gps_info[key]

    try:
        lat_ref = gps_data.get('GPSLatitudeRef')
        lon_ref = gps_data.get('GPSLongitudeRef')
        lat = gps_data.get('GPSLatitude')
        lon = gps_data.get('GPSLongitude')
        if not (lat and lon and lat_ref and lon_ref):
            return None

        lat_deg = _convert_to_degrees(lat)
        lon_deg = _convert_to_degrees(lon)
        if lat_deg is None or lon_deg is None:
            return None

        if lat_ref.upper() == 'S':
            lat_deg = -abs(lat_deg)
        if lon_ref.upper() == 'W':
            lon_deg = -abs(lon_deg)

        return (lat_deg, lon_deg, datetime_original)
    except Exception:
        return None
