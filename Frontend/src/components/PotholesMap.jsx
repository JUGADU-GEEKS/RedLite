import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100vw',
  height: '100vh',
};

const PotholesMap = () => {
  const [potholes, setPotholes] = useState([]);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    async function fetchPotholes() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/potholes/map`);
        if (!res.ok) throw new Error('Failed to fetch potholes');
        const data = await res.json();
        console.log('Potholes fetched:', data);
        // Normalize data: ensure numeric lat/lon
        const normalized = (data || []).map((p) => ({
          lat: p.lat != null ? Number(p.lat) : null,
          lon: p.lon != null ? Number(p.lon) : null,
          potholeCount: Number(p.potholeCount || 0),
          status: p.status || 'pending'
        })).filter(p => p.lat !== null && p.lon !== null && !Number.isNaN(p.lat) && !Number.isNaN(p.lon));
        setPotholes(normalized);
      } catch (e) {
        console.error('Potholes fetch error', e);
      }
    }
    fetchPotholes();
  }, []);

  // Compute center as average of points to ensure markers are visible
  const center = potholes.length > 0 ? {
    lat: potholes.reduce((s, p) => s + p.lat, 0) / potholes.length,
    lng: potholes.reduce((s, p) => s + p.lon, 0) / potholes.length,
  } : { lat: 28.6139, lng: 77.2090 };

  return isLoaded ? (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
        {potholes.map((p, idx) => (
          <Marker
            key={idx}
            position={{ lat: p.lat, lng: p.lon }}
            label={String(p.potholeCount)}
            title={`Potholes: ${p.potholeCount} — status: ${p.status}`}
          />
        ))}
      </GoogleMap>
      {/* Debug list for developers: shows fetched potholes under the map */}
      <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'white', padding: 8, borderRadius: 8, maxHeight: 200, overflow: 'auto', zIndex: 50 }}>
        <strong>Potholes (debug):</strong>
        <ul>
          {potholes.length === 0 && <li>No valid potholes returned</li>}
          {potholes.map((p, i) => (
            <li key={i} style={{ fontSize: 12 }}>
              #{i+1}: {p.potholeCount} — {p.lat.toFixed(6)}, {p.lon.toFixed(6)} ({p.status})
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : (
    <div>Loading map...</div>
  );
};

export default PotholesMap;
