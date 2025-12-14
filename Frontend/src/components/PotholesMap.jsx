import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from './Navbar';

// Custom marker component for potholes
const PotholeMarker = ({ count, position, status, isLoaded }) => {
  const getColor = (count) => {
    if (count >= 5) return '#ff5252'; // Red - severe
    if (count >= 2) return '#fdd835'; // Yellow - moderate
    return '#66bb6a'; // Green - minor
  };

  const getSeverity = (count) => {
    if (count >= 5) return 'Severe';
    if (count >= 2) return 'Moderate';
    return 'Minor';
  };

  const color = getColor(count);
  const severity = getSeverity(count);

  // Create custom marker icon using SVG data URL
  const size = count >= 5 ? 32 : count >= 2 ? 28 : 24;
  const svgIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <text x="${size/2}" y="${size/2 + 4}" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${count}</text>
    </svg>
  `)}`;

  const icon = isLoaded && window.google ? {
    url: svgIcon,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  } : undefined;

  return (
    <Marker
      position={position}
      icon={icon}
      title={`${count} pothole${count !== 1 ? 's' : ''} — ${severity} — Status: ${status}`}
      label={icon ? undefined : {
        text: String(count),
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    />
  );
};

const PotholesMap = () => {
  const [potholes, setPotholes] = useState([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFittedBounds, setHasFittedBounds] = useState(false);
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const fetchPotholes = async () => {
    setIsLoading(true);
    setHasFittedBounds(false); // Reset bounds fitting flag on refresh
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
          status: p.status || 'pending',
          gridId: p.gridId || null,
        })).filter(p => p.lat !== null && p.lon !== null && !Number.isNaN(p.lat) && !Number.isNaN(p.lon));
        setPotholes(normalized);
      } catch (e) {
        console.error('Potholes fetch error', e);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchPotholes();
  }, []);

  // Calculate map bounds to fit all markers
  const bounds = useMemo(() => {
    if (potholes.length === 0 || !isLoaded || !window.google) return null;
    const bounds = new window.google.maps.LatLngBounds();
    potholes.forEach(p => {
      bounds.extend(new window.google.maps.LatLng(p.lat, p.lon));
    });
    return bounds;
  }, [potholes, isLoaded]);

  // Fit bounds when map loads or potholes change (especially on refresh)
  useEffect(() => {
    if (mapRef.current && bounds && potholes.length > 0 && isLoaded && window.google && !hasFittedBounds) {
      // Small delay to ensure markers are rendered
      const timer = setTimeout(() => {
        if (mapRef.current && bounds) {
          // Add padding to bounds
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const neOffset = new window.google.maps.LatLng(
            ne.lat() + (ne.lat() - sw.lat()) * 0.1,
            ne.lng() + (ne.lng() - sw.lng()) * 0.1
          );
          const swOffset = new window.google.maps.LatLng(
            sw.lat() - (ne.lat() - sw.lat()) * 0.1,
            sw.lng() - (ne.lng() - sw.lng()) * 0.1
          );
          const extendedBounds = new window.google.maps.LatLngBounds(swOffset, neOffset);
          mapRef.current.fitBounds(extendedBounds);
          setHasFittedBounds(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [bounds, potholes.length, isLoaded, hasFittedBounds]);

  // Compute center as average of points (fallback - only used when no potholes)
  const center = potholes.length > 0 ? {
    lat: potholes.reduce((s, p) => s + p.lat, 0) / potholes.length,
    lng: potholes.reduce((s, p) => s + p.lon, 0) / potholes.length,
  } : { lat: 28.6139, lng: 77.2090 };

  const getSeverityColor = (count) => {
    if (count >= 5) return '#ff5252';
    if (count >= 2) return '#fdd835';
    return '#66bb6a';
  };

  const getSeverityLabel = (count) => {
    if (count >= 5) return 'Severe';
    if (count >= 2) return 'Moderate';
    return 'Minor';
  };

  const handleRecenter = () => {
    if (mapRef.current && bounds && potholes.length > 0 && isLoaded && window.google) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const neOffset = new window.google.maps.LatLng(
        ne.lat() + (ne.lat() - sw.lat()) * 0.1,
        ne.lng() + (ne.lng() - sw.lng()) * 0.1
      );
      const swOffset = new window.google.maps.LatLng(
        sw.lat() - (ne.lat() - sw.lat()) * 0.1,
        sw.lng() - (ne.lng() - sw.lng()) * 0.1
      );
      const extendedBounds = new window.google.maps.LatLngBounds(swOffset, neOffset);
      mapRef.current.fitBounds(extendedBounds);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white/70 backdrop-blur rounded-3xl shadow-xl border border-white/60">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Map Loading Error</h2>
          <p className="text-gray-700">Failed to load Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

      <Navbar />

      <div className="pt-28 px-6 max-w-7xl mx-auto pb-12 relative z-10">
        {/* Page Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
            Civilian Potholes Map
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
          <p className="text-lg text-gray-700">Live pothole reporting visualized across the city</p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Live Map</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{potholes.length} locations</span>
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                  )}
                </div>
              </div>

              {/* Map Container */}
              <div className="relative h-[600px] md:h-[70vh] rounded-2xl overflow-hidden border border-slate-300 shadow-lg">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={potholes.length > 0 ? undefined : center}
                    zoom={potholes.length > 0 ? undefined : 14}
                    options={{
                      styles: [
                        {
                          featureType: 'poi',
                          elementType: 'labels',
                          stylers: [{ visibility: 'off' }],
                        },
                      ],
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: false,
                      scaleControl: true,
                      streetViewControl: false,
                      rotateControl: false,
                      fullscreenControl: true,
                    }}
                    onLoad={(map) => {
                      mapRef.current = map;
                      // Don't fit bounds here - let the useEffect handle it after markers are rendered
                    }}
                  >
                    <AnimatePresence>
        {potholes.map((p, idx) => (
                        <PotholeMarker
                          key={`${p.lat}-${p.lon}-${idx}`}
                          count={p.potholeCount}
            position={{ lat: p.lat, lng: p.lon }}
                          status={p.status}
                          isLoaded={isLoaded}
          />
        ))}
                    </AnimatePresence>
      </GoogleMap>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading map...</p>
                    </div>
                  </div>
                )}

                {/* Floating Control Buttons */}
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                  <motion.button
                    type="button"
                    onClick={handleRecenter}
                    className="bg-white/90 backdrop-blur-sm text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-700 shadow-md hover:bg-white transition-colors flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MapPin size={14} />
                    Recenter
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={fetchPotholes}
                    disabled={isLoading}
                    className="bg-white/90 backdrop-blur-sm text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-700 shadow-md hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                  </motion.button>
                </div>

                {/* Legend Panel */}
                <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm text-xs px-4 py-3 rounded-xl border border-slate-300 text-slate-700 shadow-lg">
                  <div className="font-semibold mb-2">Severity Legend</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#ff5252] border-2 border-white shadow-sm"></div>
                      <span>Severe (≥5 potholes)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#fdd835] border-2 border-white shadow-sm"></div>
                      <span>Moderate (2-4 potholes)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#66bb6a] border-2 border-white shadow-sm"></div>
                      <span>Minor (0-1 potholes)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pothole List Panel */}
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Pothole Locations</h3>
                <button
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isListExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              <AnimatePresence>
                {isListExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {potholes.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                          {isLoading ? 'Loading potholes...' : 'No potholes reported yet'}
                        </div>
                      ) : (
                        potholes.map((p, i) => {
                          const severityColor = getSeverityColor(p.potholeCount);
                          const severityLabel = getSeverityLabel(p.potholeCount);
                          return (
                            <motion.div
                              key={`${p.lat}-${p.lon}-${i}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="p-3 rounded-lg border bg-white hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                                    style={{ backgroundColor: severityColor }}
                                  ></div>
                                  <span className="font-semibold text-sm">#{i + 1}</span>
                                </div>
                                <span
                                  className="text-xs px-2 py-1 rounded-full font-semibold text-white"
                                  style={{ backgroundColor: severityColor }}
                                >
                                  {severityLabel}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="font-mono">
                                  📍 {p.lat.toFixed(6)}, {p.lon.toFixed(6)}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>
                                    🕳️ <strong>{p.potholeCount}</strong> pothole{p.potholeCount !== 1 ? 's' : ''}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      p.status === 'resolved'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </div>
                                {p.gridId && (
                                  <div className="text-xs text-gray-400 font-mono">Grid: {p.gridId}</div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Summary when collapsed */}
              {!isListExpanded && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-red-600">{potholes.filter(p => p.potholeCount >= 5).length}</div>
                      <div className="text-gray-500">Severe</div>
                    </div>
                    <div>
                      <div className="font-bold text-yellow-600">{potholes.filter(p => p.potholeCount >= 2 && p.potholeCount < 5).length}</div>
                      <div className="text-gray-500">Moderate</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">{potholes.filter(p => p.potholeCount < 2).length}</div>
                      <div className="text-gray-500">Minor</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
              <h3 className="text-lg font-bold mb-3 text-gray-900">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-600">Total Locations</span>
                  <span className="font-bold text-gray-900">{potholes.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-600">Total Potholes</span>
                  <span className="font-bold text-gray-900">
                    {potholes.reduce((sum, p) => sum + p.potholeCount, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-bold text-amber-600">
                    {potholes.filter(p => p.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-600">Resolved</span>
                  <span className="font-bold text-green-600">
                    {potholes.filter(p => p.status === 'resolved').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PotholesMap;
