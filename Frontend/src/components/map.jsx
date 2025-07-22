import React, { useRef, useState, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import ambulanceImg from '../assets/ambulance.png';

const containerStyle = {
  width: '100vw',
  height: '100vh',
};

// Example route (lat/lng points along a road/lane)
const ROUTE = [
  { lat: 28.6315, lng: 77.2167 },
  { lat: 28.6325, lng: 77.2180 },
  { lat: 28.6335, lng: 77.2195 },
  { lat: 28.6345, lng: 77.2210 },
  { lat: 28.6355, lng: 77.2225 },
  { lat: 28.6365, lng: 77.2240 },
];
const TRAFFIC_LIGHT_IDX = 3; // Index in ROUTE for traffic light
const TRAFFIC_LIGHT_POS = ROUTE[TRAFFIC_LIGHT_IDX];
const TRAFFIC_LIGHT_COUNT = 5;
const TRAFFIC_LIGHT_RANGE_METERS = 100;
const ANIMATION_DURATION = 45; // seconds, slower speed

const ambulanceIcon = {
  url: 'https://cdn-icons-png.flaticon.com/512/11210/11210022.png', // Flaticon ambulance icon
  scaledSize: { width: 36, height: 24 }, // Smaller size
  anchor: { x: 18, y: 24 },
  labelOrigin: { x: 18, y: 12 },
};
const trafficRedIcon = {
  url: 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
  scaledSize: { width: 32, height: 32 },
  anchor: { x: 16, y: 32 },
};
const trafficGreenIcon = {
  url: 'https://cdn-icons-png.flaticon.com/512/565/565550.png',
  scaledSize: { width: 32, height: 32 },
  anchor: { x: 16, y: 32 },
};

// Haversine formula for distance in meters
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function interpolateRoute(route, t) {
  // t: 0 to 1
  if (route.length < 2) return route[0];
  const total = route.length - 1;
  const seg = t * total;
  const i = Math.floor(seg);
  const frac = seg - i;
  if (i >= total) return route[route.length - 1];
  return {
    lat: route[i].lat + (route[i + 1].lat - route[i].lat) * frac,
    lng: route[i].lng + (route[i + 1].lng - route[i].lng) * frac,
  };
}

// Calculate traffic light positions evenly spaced along the route
function getTrafficLightPositions(route, count) {
  const positions = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    positions.push(interpolateRoute(route, t));
  }
  return positions;
}

const MapPage = () => {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [running, setRunning] = useState(false);
  const intervalRef = useRef();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyBiOefptADTuxBpT5uXWcjbB3dRJ71YWEI', // <-- Inserted user key
  });

  // Animate ambulance
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    function animate() {
      const elapsed = (Date.now() - start) / 1000;
      const t = Math.min(elapsed / ANIMATION_DURATION, 1);
      setProgress(t);
      if (t < 1 && running) {
        intervalRef.current = requestAnimationFrame(animate);
      } else {
        setRunning(false);
      }
    }
    intervalRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(intervalRef.current);
    // eslint-disable-next-line
  }, [running]);

  const trafficLightPositions = getTrafficLightPositions(ROUTE, TRAFFIC_LIGHT_COUNT);
  const ambulancePos = interpolateRoute(ROUTE, progress);
  // For each light, determine if it's green (ambulance within range)
  const trafficLightStates = trafficLightPositions.map(pos => haversine(
    ambulancePos.lat, ambulancePos.lng, pos.lat, pos.lng
  ) <= TRAFFIC_LIGHT_RANGE_METERS);

  // THEME
  const theme = {
    navbar: '#181e26',
    navText: '#fff',
    navActive: '#fff',
    navActiveBg: 'transparent',
    button: '#ff8c1a',
    buttonText: '#fff',
    infoBg: '#181e26',
    infoText: '#fff',
  };

  return isLoaded ? (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#e6ede6' }}>
      {/* Controls Overlay */}
      <div style={{ position: 'absolute', top: 90, left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ background: theme.infoBg, color: theme.button, padding: '12px 28px', fontWeight: 'bold', fontSize: 22, borderRadius: 16, boxShadow: '0 2px 8px #0002', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>🚨 Emergency Response System</span>
          <button onClick={() => { setProgress(0); setRunning(true); }} style={{ background: theme.button, color: theme.buttonText, border: 'none', borderRadius: 20, padding: '10px 22px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>Start Simulation</button>
          <button onClick={() => setRunning(false)} style={{ background: theme.button, color: theme.buttonText, border: 'none', borderRadius: 20, padding: '10px 22px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>Stop</button>
          <button onClick={() => { setProgress(0); setRunning(false); }} style={{ background: theme.button, color: theme.buttonText, border: 'none', borderRadius: 20, padding: '10px 22px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>Reset</button>
        </div>
      </div>
      {/* Emergency Tag */}
      {running && (
        <div style={{ position: 'absolute', top: 56, left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ background: '#ff6b6b', color: 'white', padding: '6px 18px', borderRadius: 6, fontWeight: 'bold', fontSize: 15, boxShadow: '0 2px 8px #0002', letterSpacing: 1 }}>
            🚨 EMERGENCY VEHICLE APPROACHING 🚨
          </div>
        </div>
      )}
      {/* Info Panel */}
      <div style={{ position: 'absolute', right: 32, bottom: 32, background: theme.infoBg, color: theme.infoText, borderRadius: 16, padding: 20, minWidth: 200, boxShadow: '0 2px 8px #0002', fontSize: 18, zIndex: 10 }}>
        <div style={{ color: theme.button, fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>Route Information</div>
        <div>Progress: <span style={{ color: '#ffd54f' }}>{Math.round(progress * 100)}%</span></div>
        <div>Traffic Light: <span style={{ color: trafficLightStates[0] ? '#69f0ae' : '#e53935' }}>{trafficLightStates[0] ? 'Green' : 'Red'}</span></div>
        <div>Time: <span style={{ color: '#4fc3f7' }}>{Math.round(progress * ANIMATION_DURATION)}s / {ANIMATION_DURATION}s</span></div>
      </div>
      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={ROUTE[0]}
        zoom={16}
        options={{
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#e6ede6' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#181e26' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#ff8c1a' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fff' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#ff8c1a' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
          disableDefaultUI: true,
        }}
      >
        <Polyline path={ROUTE} options={{ strokeColor: '#ff8c1a', strokeWeight: 6 }} />
        {trafficLightPositions.map((pos, idx) => (
          <Marker
            key={'light' + idx}
            position={pos}
            icon={trafficLightStates[idx] ? trafficGreenIcon : trafficRedIcon}
            // Optionally, add a glowing effect for green lights
            label={trafficLightStates[idx] ? {
              text: '',
              className: 'glow-green'
            } : undefined}
          />
        ))}
        {/* Ambulance Marker */}
        <Marker
          position={ambulancePos}
          icon={ambulanceIcon}
        />
      </GoogleMap>
    </div>
  ) : (
    <div>Loading Map...</div>
  );
};

export default MapPage; 