import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 Props:
  - currentPos: { lat, lon, headingDeg, speed } | null
  - intersections: [{ intersectionId, lat, lon, name, distance, ahead, bearing, angleDiff, signalState, phase }] | null
  - nearestAhead: object | null
  - isActive: boolean
  - onViewportChange?: (bounds, center, zoom) => void
  - initialCenter?: [lat, lon] | { lat, lon }
*/
const AmbulanceMap = ({
  currentPos,
  intersections = [],
  nearestAhead = null,
  isActive = false,
  onViewportChange,
  initialCenter,
}) => {
  const mapRef = useRef(null);
  const ambMarkerRef = useRef(null);
  const arrowMarkerRef = useRef(null);
  const animRef = useRef(null);
  const [follow, setFollow] = useState(true);
  const lastCenteredCoordsRef = useRef(null);

  // Normalizer: accept objects with lat/lon or lat/lng or arrays
  const toLatLon = (v) => {
    if (!v) return null;
    if (Array.isArray(v) && v.length >= 2) {
      const lat = Number(v[0]), lon = Number(v[1]);
      return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    }
    const lat = Number(v.lat ?? v.latitude ?? v.latDeg);
    const lon = Number(v.lon ?? v.lng ?? v.longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  };

  // Modern minimal ambulance icon with medical cross
  const ambulanceSvg = (heading = 0) => {
    return `
      <div style="transform:translate(-50%,-50%) rotate(${heading}deg); transition: transform 0.3s ease-out;">
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#991b1b" stroke-width="1.5" filter="url(#shadow)"/>
          <path d="M20 12 L20 28 M14 20 L26 20" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <circle cx="20" cy="20" r="2" fill="#ffffff"/>
        </svg>
      </div>
    `;
  };

  // Direction arrow SVG
  const arrowSvg = (heading = 0) => {
    return `
      <div style="transform:translate(-50%,-50%) rotate(${heading}deg); transition: transform 0.3s ease-out; pointer-events: none;">
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="arrowGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M12 0 L0 20 L8 20 L8 32 L16 32 L16 20 L24 20 Z" fill="#3b82f6" stroke="#1e40af" stroke-width="1" filter="url(#arrowGlow)" opacity="0.9"/>
        </svg>
      </div>
    `;
  };

  // Traffic light SVG with halo effect for active state
  const trafficLightSvg = (state = 'red', isActive = false) => {
    const colors = {
      red: '#ef4444',
      yellow: '#f59e0b',
      green: '#10b981',
    };
    const color = colors[state] || colors.red;
    const halo = isActive ? `
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.2"/>
      <circle cx="16" cy="16" r="11" fill="${color}" opacity="0.15"/>
    ` : '';
    
    return `
      <div style="transform:translate(-50%,-50%);">
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          ${halo}
          <rect x="8" y="4" width="16" height="24" rx="2" fill="#1f2937" stroke="#111827" stroke-width="1"/>
          <circle cx="16" cy="10" r="4" fill="${state === 'red' ? color : '#374151'}" stroke="#fff" stroke-width="0.5"/>
          <circle cx="16" cy="16" r="4" fill="${state === 'yellow' ? color : '#374151'}" stroke="#fff" stroke-width="0.5"/>
          <circle cx="16" cy="22" r="4" fill="${state === 'green' ? color : '#374151'}" stroke="#fff" stroke-width="0.5"/>
        </svg>
      </div>
    `;
  };

  // Traffic intersection marker SVG (existing)
  const trafficSvg = (color = '#e53935', highlight = false) => {
    const ring = highlight ? `<circle cx="16" cy="16" r="12" fill="none" stroke="#fff" stroke-width="2" opacity="0.25"/>` : '';
    return `
      <div style="transform:translate(-50%,-50%);">
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          ${ring}
          <circle cx="16" cy="16" r="8" fill="${color}" stroke="#111" stroke-width="1"/>
        </svg>
      </div>
    `;
  };

  // Get signal state from intersection data
  const getSignalState = (intersection) => {
    // Try multiple possible field names
    if (intersection?.signalState) return intersection.signalState.toLowerCase();
    if (intersection?.phase) return intersection.phase.toLowerCase();
    if (intersection?.state) {
      // If state is an object, try to get a primary state
      if (typeof intersection.state === 'object') {
        const states = Object.values(intersection.state);
        if (states.includes('green')) return 'green';
        if (states.includes('yellow')) return 'yellow';
        return 'red';
      }
      return String(intersection.state).toLowerCase();
    }
    // Fallback: if ahead, assume green; otherwise red
    return intersection?.ahead ? 'green' : 'red';
  };

  // Calculate ETA in seconds
  const calculateETA = (distance, speed) => {
    if (!distance || !speed || speed <= 0) return null;
    return distance / speed; // seconds
  };

  // Format ETA display
  const formatETA = (etaSeconds) => {
    if (etaSeconds === null || etaSeconds === undefined) return '--';
    if (etaSeconds < 60) return `${Math.round(etaSeconds)} sec`;
    return `${(etaSeconds / 60).toFixed(1)} min`;
  };

  // Format speed display
  const formatSpeed = (speedMs) => {
    if (!speedMs || speedMs <= 0) return '0 km/h';
    const kmh = (speedMs * 3.6).toFixed(1);
    return `${kmh} km/h`;
  };

  // memoized icons
  const ambulanceDivIcon = useMemo(() => {
    return L.divIcon({
      className: 'ambulance-div-icon',
      html: ambulanceSvg(0),
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }, []);

  const arrowDivIcon = useMemo(() => {
    return L.divIcon({
      className: 'arrow-div-icon',
      html: arrowSvg(0),
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -32],
    });
  }, []);

  const trafficLightIconBase = useMemo(() => {
    return (state = 'red', isActive = false) =>
      L.divIcon({
        className: 'traffic-light-div-icon',
        html: trafficLightSvg(state, isActive),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -12],
      });
  }, []);

  const trafficIconBase = useMemo(() => {
    return (color = '#e53935', highlight = false) =>
      L.divIcon({
        className: 'traffic-div-icon',
        html: trafficSvg(color, highlight),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -12],
      });
  }, []);

  // prepare validated intersections list
  const validIntersections = useMemo(() => {
    return (intersections || []).map((ix) => {
      const coords = toLatLon(ix);
      if (!coords) return null;
      return { ...ix, __coords: coords, __signalState: getSignalState(ix) };
    }).filter(Boolean);
  }, [intersections]);

  // Calculate ETA for nearest intersection
  const etaInfo = useMemo(() => {
    if (!nearestAhead || !currentPos) return null;
    const distance = nearestAhead.distance;
    const speed = currentPos.speed || 0;
    const etaSeconds = calculateETA(distance, speed);
    return {
      distance: distance,
      speed: speed,
      etaSeconds: etaSeconds,
      formattedETA: formatETA(etaSeconds),
      formattedSpeed: formatSpeed(speed),
    };
  }, [nearestAhead, currentPos]);

  // Safe center - prioritize currentPos, then initialCenter, only fallback to India if both null
  const safeCenter = useMemo(() => {
    const cp = toLatLon(currentPos);
    if (cp) return cp;
    const ic = toLatLon(initialCenter);
    if (ic) return ic;
    return null; // Will be handled by MapContainer
  }, [currentPos, initialCenter]);

  // Center map on GPS coordinates when they arrive (or initialCenter if provided)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Try currentPos first, then initialCenter
    const coords = toLatLon(currentPos) || toLatLon(initialCenter);
    if (!coords) return;
    
    // Check if we've already centered on these exact coordinates
    const coordsKey = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
    if (lastCenteredCoordsRef.current === coordsKey) return;
    
    // Center the map on these coordinates
    map.setView(coords, 16, { animate: false });
    lastCenteredCoordsRef.current = coordsKey;
  }, [currentPos, initialCenter]);

  // Create / update ambulance marker and animate movement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coords = toLatLon(currentPos);
    if (!coords) return;

    const [lat, lon] = coords;
    const targetLatLng = L.latLng(lat, lon);
    const heading = currentPos?.headingDeg ?? 0;

    // Create ambulance marker if needed
    if (!ambMarkerRef.current) {
      const icon = L.divIcon({
        className: 'ambulance-div-icon',
        html: ambulanceSvg(heading),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });
      const m = L.marker(targetLatLng, { icon, interactive: true }).addTo(map);
      ambMarkerRef.current = m;

      // Enhanced popup with ETA info
      const popupContent = `
        <div style="font-size:12px; min-width: 180px;">
          <strong>🚑 Ambulance</strong><br/>
          <div style="margin-top: 4px;">
            <div>📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}</div>
            <div>🧭 Heading: ${heading.toFixed(1)}°</div>
            <div>⚡ Speed: ${formatSpeed(currentPos?.speed || 0)}</div>
            ${etaInfo ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;">
                <strong>Nearest Intersection:</strong><br/>
                📏 ${Math.round(etaInfo.distance)} m<br/>
                ⏱️ ETA: ${etaInfo.formattedETA}
              </div>
            ` : ''}
          </div>
        </div>
      `;
      m.bindPopup(popupContent);
      m.bindTooltip(`🚑 ${lat.toFixed(6)}, ${lon.toFixed(6)}`, { permanent: false, direction: 'top', offset: [0, -12] });

      // Center map on marker creation if following
      if (follow) {
        const coordsKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
        if (lastCenteredCoordsRef.current !== coordsKey) {
          map.setView(targetLatLng, 16, { animate: false });
          lastCenteredCoordsRef.current = coordsKey;
        }
      }
    }

    // Create arrow marker if needed
    if (!arrowMarkerRef.current && heading != null) {
      const arrowIcon = L.divIcon({
        className: 'arrow-div-icon',
        html: arrowSvg(heading),
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
      });
      // Position arrow slightly ahead of ambulance
      const arrowOffset = 0.00015; // ~15 meters at equator
      const arrowLat = lat + arrowOffset * Math.cos((heading - 90) * Math.PI / 180);
      const arrowLon = lon + arrowOffset * Math.sin((heading - 90) * Math.PI / 180);
      const arrowMarker = L.marker([arrowLat, arrowLon], { icon: arrowIcon, interactive: false }).addTo(map);
      arrowMarkerRef.current = arrowMarker;
    }

    // Animate from marker position to target
    const marker = ambMarkerRef.current;
    const arrowMarker = arrowMarkerRef.current;
    const start = marker.getLatLng();
    const end = targetLatLng;
    const distanceMs = 600; // base animation duration
    const startTime = performance.now();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / distanceMs);
      const lat1 = start.lat + (end.lat - start.lat) * t;
      const lng1 = start.lng + (end.lng - start.lng) * t;
      marker.setLatLng([lat1, lng1]);

      // Update arrow position and rotation
      if (arrowMarker && heading != null) {
        const arrowOffset = 0.00015;
        const arrowLat = lat1 + arrowOffset * Math.cos((heading - 90) * Math.PI / 180);
        const arrowLon = lng1 + arrowOffset * Math.sin((heading - 90) * Math.PI / 180);
        arrowMarker.setLatLng([arrowLat, arrowLon]);
        const arrowEl = arrowMarker.getElement();
        if (arrowEl) {
          arrowEl.style.transform = `translate(-50%,-50%) rotate(${heading}deg)`;
        }
      }

      // Update ambulance rotation
      const el = marker.getElement();
      if (el && heading != null) {
        el.style.transform = `translate(-50%,-50%) rotate(${heading}deg)`;
      }

      // Update popup/tooltip contents with live coords
      const popup = marker.getPopup();
      if (popup) {
        const popupContent = `
          <div style="font-size:12px; min-width: 180px;">
            <strong>🚑 Ambulance</strong><br/>
            <div style="margin-top: 4px;">
              <div>📍 ${lat1.toFixed(6)}, ${lng1.toFixed(6)}</div>
              <div>🧭 Heading: ${heading.toFixed(1)}°</div>
              <div>⚡ Speed: ${formatSpeed(currentPos?.speed || 0)}</div>
              ${etaInfo ? `
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;">
                  <strong>Nearest Intersection:</strong><br/>
                  📏 ${Math.round(etaInfo.distance)} m<br/>
                  ⏱️ ETA: ${etaInfo.formattedETA}
                </div>
              ` : ''}
            </div>
          </div>
        `;
        popup.setContent(popupContent);
      }
      const tooltip = marker.getTooltip();
      if (tooltip) tooltip.setContent(`🚑 ${lat1.toFixed(6)}, ${lng1.toFixed(6)}`);

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        if (follow) {
          try { map.panTo(end, { animate: true, duration: 0.6 }); } catch (e) {}
        }
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPos?.lat, currentPos?.lon, currentPos?.headingDeg, currentPos?.speed, follow, etaInfo]);

  // Update arrow rotation when heading changes
  useEffect(() => {
    if (!arrowMarkerRef.current || currentPos?.headingDeg == null) return;
    const heading = currentPos.headingDeg;
    const arrowEl = arrowMarkerRef.current.getElement();
    if (arrowEl) {
      arrowEl.style.transform = `translate(-50%,-50%) rotate(${heading}deg)`;
    }
  }, [currentPos?.headingDeg]);

  // Handle viewport changes (optional callback)
  useEffect(() => {
    if (!onViewportChange) return;
    const map = mapRef.current;
    if (!map) return;
    const handler = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onViewportChange(bounds, [center.lat, center.lng], map.getZoom());
    };
    map.on('moveend zoomend', handler);
    return () => map.off('moveend zoomend', handler);
  }, [onViewportChange]);

  const trafficColorFor = (it) => (it?.ahead ? '#69f0ae' : '#e53935');

  // Default center fallback (only used if safeCenter is null)
  const defaultCenter = safeCenter || [20.5937, 78.9629];

  return (
    <div className="relative h-96 md:h-[480px] w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/50">
      <MapContainer
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          detectRetina={true}
        />

        {/* Render traffic light markers for each intersection */}
        {validIntersections.map((ix) => {
          const pos = ix.__coords;
          const signalState = ix.__signalState;
          const isNearest = nearestAhead && (nearestAhead.intersectionId === ix.intersectionId);
          const lightIcon = trafficLightIconBase(signalState, isNearest);
          return (
            <Marker 
              key={`light-${ix.intersectionId ?? `${pos[0]}-${pos[1]}`}`} 
              position={[pos[0] + 0.00005, pos[1] + 0.00005]} 
              icon={lightIcon}
            >
              <Tooltip permanent direction="top" offset={[0, -10]} className="text-xs">
                🚦 {ix.intersectionId ?? 'IX'} · {signalState.toUpperCase()}
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">🚦 Traffic Light</div>
                  <div className="text-slate-400">{ix.intersectionId}</div>
                  <div className="text-slate-300 mt-1">
                    State: <span className="font-bold" style={{ color: signalState === 'green' ? '#10b981' : signalState === 'yellow' ? '#f59e0b' : '#ef4444' }}>
                      {signalState.toUpperCase()}
                    </span>
                  </div>
                  {ix.name && <div className="text-slate-300 mt-1">{ix.name}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render intersection markers (existing functionality) */}
        {validIntersections.map((ix) => {
          const pos = ix.__coords;
          const isNearest = nearestAhead && (nearestAhead.intersectionId === ix.intersectionId);
          const icon = trafficIconBase(trafficColorFor(ix), !!isNearest);
          return (
            <Marker key={ix.intersectionId ?? `${pos[0]}-${pos[1]}`} position={pos} icon={icon}>
              <Tooltip permanent direction="top" offset={[0, -10]} className="text-xs">
                {ix.intersectionId ?? 'IX'} · {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{ix.intersectionId}</div>
                  {ix.name && <div className="text-slate-400">{ix.name}</div>}
                  <div className="text-slate-300 mt-1">
                    {ix.distance != null ? `${Math.round(ix.distance)} m` : '--'} · Bearing {ix.bearing != null ? `${Math.round(ix.bearing)}°` : '--'}
                  </div>
                  <div className="text-slate-300 mt-1">lat: {pos[0].toFixed(6)}<br/>lon: {pos[1].toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Fallback/static ambulance marker so the vehicle appears immediately while the animated L.marker is created */}
        {currentPos && !ambMarkerRef.current && (() => {
          const p = toLatLon(currentPos);
          const heading = currentPos?.headingDeg ?? 0;
          const icon = L.divIcon({
            className: 'ambulance-div-icon',
            html: ambulanceSvg(heading),
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
          });
          return p ? (
            <Marker position={p} icon={icon}>
              <Tooltip permanent direction="top" offset={[0, -10]} className="text-xs">
                🚑 AMB · {p[0].toFixed(6)}, {p[1].toFixed(6)}
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">🚑 Ambulance</div>
                  <div>lat: {p[0].toFixed(6)}</div>
                  <div>lon: {p[1].toFixed(6)}</div>
                  <div>heading: {heading.toFixed(1)}°</div>
                  <div>speed: {formatSpeed(currentPos?.speed || 0)}</div>
                </div>
              </Popup>
            </Marker>
          ) : null;
        })()}

        {/* Ambulance marker is still managed directly via Leaflet L.marker for smooth animation */}
      </MapContainer>

      <div className="absolute top-3 right-3 z-50">
        <button
          type="button"
          onClick={() => setFollow((s) => !s)}
          className="bg-slate-900/60 text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-100 shadow-sm"
        >
          {follow ? 'Following' : 'Free roam'}
        </button>
      </div>

      {/* ETA and Distance Display */}
      {etaInfo && (
        <div className="absolute left-3 bottom-3 z-50 bg-slate-900/80 backdrop-blur-sm text-xs px-4 py-3 rounded-xl border border-slate-700 text-slate-100 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">📍</span>
              <span className="font-semibold">Nearest Intersection</span>
            </div>
            <div className="pl-6 space-y-0.5 text-xs">
              <div>📏 Distance: <span className="font-mono">{Math.round(etaInfo.distance)} m</span></div>
              <div>⚡ Speed: <span className="font-mono">{etaInfo.formattedSpeed}</span></div>
              <div>⏱️ ETA: <span className="font-mono font-semibold text-emerald-400">{etaInfo.formattedETA}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {!etaInfo && (
        <div className="absolute left-3 bottom-3 z-50 bg-slate-900/60 text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-100">
          <div className="flex items-center gap-2">
            <div dangerouslySetInnerHTML={{ __html: `<div style="width:18px;height:18px">${trafficSvg('#69f0ae', false)}</div>` }} />
            <span className="text-xs">Nearest ahead</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbulanceMap;
