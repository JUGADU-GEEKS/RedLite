const EARTH_RADIUS_METERS = 6371000;
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CARDINAL_SLICE = 360 / CARDINALS.length;
const SPEED_THRESHOLD_MPS = 0.2777777777777778; // 1 km/h
const MIN_SPEED_FALLBACK = 1.5; // m/s fallback per requirements

const toRadians = (deg) => (deg * Math.PI) / 180;

export const normalizeHeading = (heading) => {
  if (heading === null || heading === undefined || Number.isNaN(heading)) {
    return null;
  }
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

export const calculateBearingDeg = (lat1, lon1, lat2, lon2) => {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
};

export const angleDifferenceDeg = (angle1, angle2) => {
  if (angle1 === null || angle2 === null) return null;
  const diff = Math.abs(((angle1 - angle2 + 180) % 360 + 360) % 360 - 180);
  return Math.abs(diff);
};

export const headingToCardinal = (headingDeg) => {
  const normalized = normalizeHeading(headingDeg);
  if (normalized === null) return '--';
  const index = Math.round(normalized / CARDINAL_SLICE) % CARDINALS.length;
  return CARDINALS[index];
};

export const deriveHeadingDeg = (currentPos, lastPos) => {
  if (!currentPos) return null;
  const nativeHeading =
    typeof currentPos.headingNative === 'number'
      ? normalizeHeading(currentPos.headingNative)
      : null;
  if (nativeHeading !== null && (currentPos.speed || 0) > 0.5) {
    return nativeHeading;
  }
  if (
    lastPos &&
    typeof lastPos.lat === 'number' &&
    typeof lastPos.lon === 'number' &&
    (lastPos.lat !== currentPos.lat || lastPos.lon !== currentPos.lon)
  ) {
    return calculateBearingDeg(lastPos.lat, lastPos.lon, currentPos.lat, currentPos.lon);
  }
  return null;
};

export const effectiveSpeed = (speedMps) => {
  if (!speedMps || speedMps <= SPEED_THRESHOLD_MPS) {
    return MIN_SPEED_FALLBACK;
  }
  return speedMps;
};

export const computeEtaSeconds = (distanceMeters, speedMps) => {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  return distanceMeters / effectiveSpeed(speedMps);
};

