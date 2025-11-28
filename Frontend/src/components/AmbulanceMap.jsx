import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 Props:
  - currentPos: { lat, lon, headingDeg, speed } | null
  - intersections: [{ intersectionId, lat, lon, name, distance, ahead, bearing, angleDiff }]
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
  const animRef = useRef(null);
  const [follow, setFollow] = useState(true);

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

  // Basic SVGs for icons (inline so no external assets required)
  const ambulanceSvg = (heading = 0) => {
    return `
      <div style="transform:translate(-50%,-50%);">
        <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" >
          <g transform="translate(0,0)">
            <rect x="6" y="18" width="44" height="22" rx="3" fill="#ff6b6b" stroke="#b23b3b" stroke-width="1"/>
            <rect x="10" y="22" width="10" height="10" rx="1" fill="#fff"/>
            <rect x="38" y="22" width="10" height="10" rx="1" fill="#fff"/>
            <circle cx="18" cy="44" r="4" fill="#222" />
            <circle cx="46" cy="44" r="4" fill="#222" />
            <rect x="24" y="12" width="16" height="6" rx="2" fill="#2b6ef6"/>
            <text x="32" y="34" font-size="10" font-family="Arial" fill="#fff" text-anchor="middle" dominant-baseline="middle">AMB</text>
          </g>
        </svg>
      </div>
    `;
  };

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

  // memoized icons
  const ambulanceDivIcon = useMemo(() => {
    return L.divIcon({
      className: 'ambulance-div-icon',
      html: ambulanceSvg(0),
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
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
      return { ...ix, __coords: coords };
    }).filter(Boolean);
  }, [intersections]);

  // safe center
  const safeCenter = (() => {
    const ic = toLatLon(initialCenter);
    if (ic) return ic;
    const cp = toLatLon(currentPos);
    if (cp) return cp;
    return [20.5937, 78.9629];
  })();

  // create / update ambulance marker and animate movement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coords = toLatLon(currentPos);
    if (!coords) return;

    const [lat, lon] = coords;
    const targetLatLng = L.latLng(lat, lon);

    // create marker if needed
    if (!ambMarkerRef.current) {
      const m = L.marker(targetLatLng, { icon: ambulanceDivIcon, interactive: true }).addTo(map);
      ambMarkerRef.current = m;

      // bind popup and tooltip that show coordinates (updates while animating)
      m.bindPopup(`<div style="font-size:12px"><strong>Ambulance</strong><br/>lat: ${lat.toFixed(6)}<br/>lon: ${lon.toFixed(6)}<br/>heading: ${currentPos?.headingDeg ?? 0}°</div>`);
      m.bindTooltip(`AMB ${lat.toFixed(6)}, ${lon.toFixed(6)}`, { permanent: true, direction: 'top', offset: [0, -12] });

      // initial rotation if element ready
      const el = m.getElement();
      if (el && currentPos?.headingDeg != null) el.style.transform = `translate(-50%,-50%) rotate(${currentPos.headingDeg}deg)`;
      if (follow) map.setView(targetLatLng, map.getZoom(), { animate: false });
      return;
    }

    // animate from marker position to target
    const marker = ambMarkerRef.current;
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

      // update popup/tooltip contents with live coords
      const popup = marker.getPopup();
      if (popup) popup.setContent(`<div style="font-size:12px"><strong>Ambulance</strong><br/>lat: ${lat1.toFixed(6)}<br/>lon: ${lng1.toFixed(6)}<br/>heading: ${currentPos?.headingDeg ?? 0}°</div>`);
      const tooltip = marker.getTooltip();
      if (tooltip) tooltip.setContent(`AMB ${lat1.toFixed(6)}, ${lng1.toFixed(6)}`);

      const el = marker.getElement();
      if (el && currentPos?.headingDeg != null) {
        el.style.transform = `translate(-50%,-50%) rotate(${currentPos.headingDeg}deg)`;
      }
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
  }, [currentPos?.lat, currentPos?.lon, currentPos?.headingDeg, follow, ambulanceDivIcon]);

  // handle viewport changes (optional callback)
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

  return (
    <div className="relative h-96 md:h-[480px] w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/50">
      <MapContainer
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
        center={safeCenter}
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

        {/* debug: show what arrived (remove in prod) */}
        {/* eslint-disable-next-line no-console */}
        {useMemo(() => { console.debug('AmbulanceMap props:', { currentPos, intersections, nearestAhead }); return null; }, [currentPos, intersections, nearestAhead])}

        {/* Render intersections normally (only valid coords) */}
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
          return p ? (
            <Marker position={p} icon={ambulanceDivIcon}>
              <Tooltip permanent direction="top" offset={[0, -10]} className="text-xs">
                AMB · {p[0].toFixed(6)}, {p[1].toFixed(6)}
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">Ambulance</div>
                  <div>lat: {p[0].toFixed(6)}</div>
                  <div>lon: {p[1].toFixed(6)}</div>
                  <div>heading: {currentPos?.headingDeg ?? 0}°</div>
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

      <div className="absolute left-3 bottom-3 z-50 bg-slate-900/60 text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-100">
        <div className="flex items-center gap-2">
          <div dangerouslySetInnerHTML={{ __html: `<div style="width:18px;height:18px">${trafficSvg('#69f0ae', false)}</div>` }} />
          <span className="text-xs">Nearest ahead</span>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceMap;