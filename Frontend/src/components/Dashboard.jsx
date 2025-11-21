import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import HowItWorks from './HowItWorks';
import MapPage from './map';
import Team from './team';

const laneDetails = {
  north: { label: 'North Lane', icon: ArrowUp, color: 'from-blue-500 to-cyan-500' },
  south: { label: 'South Lane', icon: ArrowDown, color: 'from-emerald-500 to-teal-500' },
  east: { label: 'East Lane', icon: ArrowRight, color: 'from-purple-500 to-pink-500' },
  west: { label: 'West Lane', icon: ArrowLeft, color: 'from-orange-500 to-red-500' },
};

const videoFiles = [
  { file: '1.mp4', lane: 'north' },
  { file: '2.mp4', lane: 'south' },
  { file: '3.mp4', lane: 'east' },
  { file: '4.mp4', lane: 'west' },
];

// Floating elements for background decoration
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  >
    {children}
  </motion.div>
);

function TrafficLight({ signal }) {
  const colorMap = {
    red: ['red', 'gray', 'gray'],
    yellow: ['gray', 'yellow', 'gray'],
    green: ['gray', 'gray', 'green'],
  };
  const tailwindColor = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    gray: 'bg-gray-500/40',
  };
  const glowMap = {
    red: 'shadow-[0_0_12px_rgba(239,68,68,0.5)]',
    yellow: 'shadow-[0_0_12px_rgba(250,204,21,0.5)]',
    green: 'shadow-[0_0_12px_rgba(34,197,94,0.5)]',
    gray: '',
  };
  const colors = colorMap[signal] || ['gray', 'gray', 'gray'];
  return (
    <div className="absolute -top-6 -left-16 z-20">
      <div className="bg-gradient-to-b from-gray-600 to-gray-800 border-2 border-gray-300/50 rounded-xl px-2 py-3 flex flex-col items-center gap-2.5 shadow-xl">
        {[0, 1, 2].map(i => {
          const color = colors[i];
          const glow = glowMap[color];
          return (
            <div
              key={i}
              className={`w-5 h-5 rounded-full ${tailwindColor[color]} ${glow} transition-all duration-500`}
            />
          );
        })}
      </div>
    </div>
  );
}

function LaneCard({
  lane, video, data, light, currentGreen, lastGreenTime,
  vehicleCounts, onManualChange, loading, started
}) {
  let borderColor = 'border-gray-300/50';
  let borderGlow = '';
  if (light === 'red') {
    borderColor = 'border-red-400/60';
    borderGlow = 'shadow-[0_0_20px_rgba(239,68,68,0.15)]';
  } else if (light === 'yellow') {
    borderColor = 'border-yellow-400/60';
    borderGlow = 'shadow-[0_0_20px_rgba(250,204,21,0.15)]';
  } else if (light === 'green') {
    borderColor = 'border-green-400/60';
    borderGlow = 'shadow-[0_0_20px_rgba(34,197,94,0.15)]';
  }

  return (
    <motion.div
      className={`relative w-full max-w-md h-auto bg-white/80 backdrop-blur-sm border-[3px] ${borderColor} ${borderGlow} rounded-2xl pl-8 pr-6 pt-6 pb-4 shadow-xl overflow-visible transition-all duration-500 hover:shadow-2xl hover:bg-white/90`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <TrafficLight signal={light} />
      <div className="flex flex-col items-start justify-start mb-4">
        <h3 className="text-xl tracking-wide text-gray-800 font-semibold">
          {laneDetails[lane].label}
        </h3>
      </div>
      <div className="relative rounded-xl overflow-hidden shadow-lg">
        {started && data && data.frame ? (
          <img
            src={`data:image/jpeg;base64,${data.frame}`}
            alt={`Detected Frame for ${video}`}
            className="w-full h-52 object-cover bg-black"
          />
        ) : (
          <video
            src={`/Videos/${video}`}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-52 object-cover bg-black"
          />
        )}
        <div className="absolute top-3 right-3">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-full p-1.5">
            <Eye className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      <div className="absolute top-6 right-6">
        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : data && data.frame ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      </div>
      <motion.button
        onClick={() => onManualChange(lane)}
        className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-semibold hover:from-amber-600 hover:to-orange-600"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        Change Manually
      </motion.button>
      {started && (
        <div className="flex flex-col gap-3 mt-4 items-start w-full">
          <div className="text-base text-gray-700 font-medium">
            Total Vehicles: <span className="font-mono ml-1 text-amber-600 font-bold">{data?.total || 0}</span>
          </div>
          <div className="text-base text-gray-700 font-medium">
            Last Green Time: <span className="font-mono ml-1 text-amber-600 font-bold">{lastGreenTime}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
function Dashboard({ onHowItWorksClick, onHomeClick, onDashboardClick, onMapClick, onTeamClick }) {
  const navigate = useNavigate();
  const [videoData, setVideoData] = useState({});
  const [lights, setLights] = useState({});
  const [currentGreen, setCurrentGreen] = useState(null);
  const [lastGreenTime, setLastGreenTime] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState({});
  const [ambulancePopup, setAmbulancePopup] = useState({ active: false, message: '' });
  const [locationStatus, setLocationStatus] = useState({ 
    detected: false, 
    loading: false, 
    error: null, 
    coordinates: null 
  });
  const [debugInfo, setDebugInfo] = useState({
    lastSent: null,
    backendResponse: null,
    timestamp: null,
    currentBackendCoords: null
  });
  const wsRef = useRef(null);

  const getCurrentTrafficCoords = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/get_traffic_coords`);
      const result = await response.json();
      console.log('Current traffic coordinates:', result);
      
      // Update debug info with current backend coordinates
      if (result.status === 'success') {
        setDebugInfo(prev => ({
          ...prev,
          currentBackendCoords: result.coordinates
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get current traffic coordinates:', error);
      return null;
    }
  };

  const detectAndSendLocation = async () => {
    setLocationStatus(prev => ({ ...prev, loading: true, error: null }));
    
    if (!navigator.geolocation) {
      setLocationStatus(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Geolocation is not supported by this browser.' 
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
          // Update debug info with coordinates being sent
          setDebugInfo({
            lastSent: { lat, lon },
            backendResponse: null,
            timestamp: new Date().toLocaleTimeString()
          });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/set_current_location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon })
          });
          
          const result = await response.json();
          
          // Update debug info with backend response
          setDebugInfo(prev => ({
            ...prev,
            backendResponse: result
          }));
          
          if (result.status === 'success') {
            setLocationStatus({
              detected: true,
              loading: false,
              error: null,
              coordinates: { lat, lon }
            });
            console.log('Location sent successfully:', result.message);
          } else {
            setLocationStatus(prev => ({ 
              ...prev, 
              loading: false, 
              error: result.message || 'Failed to set location' 
            }));
          }
        } catch (error) {
          setDebugInfo(prev => ({
            ...prev,
            backendResponse: { error: error.message }
          }));
          setLocationStatus(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Failed to send location: ${error.message}` 
          }));
        }
      },
      (error) => {
        let errorMessage = 'Error detecting location: ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Unknown error occurred.';
            break;
        }
        setLocationStatus(prev => ({ 
          ...prev, 
          loading: false, 
          error: errorMessage 
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };


  const startDetection = () => {
    if (wsRef.current) return;
    setStarted(true);
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/detect`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.light_status) {
        setLights(data.light_status);
        return;
      }
      setVideoData(prev => ({
        ...prev,
        [data.video]: {
          frame: data.frame,
          total: data.total,
        }
      }));
      if (data.lights) setLights(data.lights);
      if (data.current_green) setCurrentGreen(data.current_green);
      if (data.last_green_time) setLastGreenTime(data.last_green_time);
      if (data.vehicle_counts) setVehicleCounts(data.vehicle_counts);

      if (data.override_active) {
        setAmbulancePopup({
          active: true,
          message: `AMBULANCE OVERRIDE ACTIVE: ${data.override_direction.toUpperCase()} GREEN, others RED`
        });
      } else if (ambulancePopup.active) {
        setAmbulancePopup({ active: false, message: '' });
      }
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
      wsRef.current = null;
    };
  };

  const handleManualChange = (lane) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'manual_change', lane }));
      setLoading(prev => ({ ...prev, [lane]: true }));
      setTimeout(() => setLoading(prev => ({ ...prev, [lane]: false })), 1000);
    }
  };

  useEffect(() => {
    // Automatically detect and send location when component mounts
    detectAndSendLocation();
    
    // Get current backend coordinates for debugging
    getCurrentTrafficCoords();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const formatLastGreenAgo = (t) => {
    if (!t) return '-';
    const secondsAgo = Math.floor((Date.now() / 1000) - t);
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Debug Panel - Top Right */}
      {debugInfo.lastSent && (
        <motion.div
          className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl max-w-sm"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-green-400">🐛 Debug Info</h3>
            <div className="flex space-x-2">
              <button
                onClick={getCurrentTrafficCoords}
                className="text-blue-400 hover:text-blue-300 text-xs"
                title="Refresh backend coordinates"
              >
                🔄
              </button>
              <button
                onClick={() => setDebugInfo({ lastSent: null, backendResponse: null, timestamp: null, currentBackendCoords: null })}
                className="text-gray-400 hover:text-white text-xs"
                title="Close debug panel"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400">Sent at:</span>
              <span className="ml-1 text-white">{debugInfo.timestamp}</span>
            </div>
            
            <div>
              <span className="text-gray-400">Coordinates:</span>
              <div className="ml-1 text-white font-mono">
                <div>Lat: {debugInfo.lastSent?.lat?.toFixed(8)}</div>
                <div>Lon: {debugInfo.lastSent?.lon?.toFixed(8)}</div>
              </div>
            </div>
            
            {debugInfo.backendResponse && (
              <div>
                <span className="text-gray-400">Backend Response:</span>
                <div className="ml-1 text-white">
                  {debugInfo.backendResponse.status === 'success' ? (
                    <span className="text-green-400">✅ Success</span>
                  ) : (
                    <span className="text-red-400">❌ Error</span>
                  )}
                </div>
                {debugInfo.backendResponse.message && (
                  <div className="ml-1 text-gray-300 text-xs mt-1">
                    {debugInfo.backendResponse.message}
                  </div>
                )}
              </div>
            )}

            {debugInfo.currentBackendCoords && (
              <div>
                <span className="text-gray-400">Current Backend Coords:</span>
                <div className="ml-1 text-white font-mono">
                  <div>Lat: {debugInfo.currentBackendCoords.lat?.toFixed(8)}</div>
                  <div>Lon: {debugInfo.currentBackendCoords.lon?.toFixed(8)}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Enhanced background elements - similar to landing */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-20 right-1/4">
          <FloatingElement delay={0}>
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400/30 to-orange-400/30 rounded-lg rotate-45"></div>
          </FloatingElement>
        </div>
        <div className="absolute bottom-1/3 left-10">
          <FloatingElement delay={1} duration={4}>
            <div className="w-4 h-4 bg-gradient-to-br from-yellow-400/30 to-amber-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
        <div className="absolute top-1/3 left-1/3">
          <FloatingElement delay={2} duration={5}>
            <div className="w-8 h-2 bg-gradient-to-r from-orange-400/30 to-red-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center p-4 transition-colors duration-500" style={{ paddingTop: '5.5rem' }}>
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="fixed top-24 left-8 z-50 flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>

        <Navbar 
          onHowItWorksClick={onHowItWorksClick} 
          onHomeClick={onHomeClick} 
          onDashboardClick={onDashboardClick}
          onMapClick={onMapClick}
          onTeamClick={onTeamClick}
        />
        
        {/* Enhanced Header Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif leading-tight">
            Lanezy Dashboard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-8"></div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-600 leading-relaxed font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Real-time vehicle detection and traffic flow analysis using{' '}
            <span className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              advanced YOLO computer vision technology
            </span>
          </motion.p>
        </motion.div>


        {ambulancePopup.active && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-red-600 to-red-700 text-white p-8 rounded-2xl shadow-2xl z-50 flex flex-col items-center justify-center text-center max-w-sm w-11/12 backdrop-blur-sm border border-red-500/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => setAmbulancePopup({ active: false, message: '' })}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-red-700/50 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <div className="text-2xl font-bold mb-3">🚨 EMERGENCY OVERRIDE! 🚨</div>
            <p className="text-lg">{ambulancePopup.message}</p>
            <p className="mt-2 text-sm opacity-80">System is prioritizing emergency vehicle.</p>
          </motion.div>
        )}

        {!started && (
          <>
            <motion.button
              onClick={startDetection}
              className="mb-16 group px-12 py-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-semibold shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 border border-white/20 text-xl"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="flex items-center space-x-3">
                <span>Start Detection</span>
                <motion.span
                  className="group-hover:translate-x-1 transition-transform duration-300"
                >
                  →
                </motion.span>
              </span>
            </motion.button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto">
              {videoFiles.map(({ file, lane }) => (
                <motion.div 
                  key={file} 
                  className="flex justify-center"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: videoFiles.findIndex(v => v.file === file) * 0.1 }}
                >
                  <LaneCard
                    lane={lane}
                    video={file}
                    data={videoData[file]}
                    light={lights[lane] || 'red'}
                    currentGreen={currentGreen}
                    lastGreenTime={formatLastGreenAgo(lastGreenTime)}
                    vehicleCounts={vehicleCounts}
                    onManualChange={handleManualChange}
                    loading={loading[lane]}
                    started={false}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
        
        {started && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto">
            {videoFiles.map(({ file, lane }) => (
              <motion.div 
                key={file} 
                className="flex justify-center"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: videoFiles.findIndex(v => v.file === file) * 0.1 }}
              >
                <LaneCard
                  lane={lane}
                  video={file}
                  data={videoData[file]}
                  light={lights[lane] || 'red'}
                  currentGreen={currentGreen}
                  lastGreenTime={formatLastGreenAgo(lastGreenTime)}
                  vehicleCounts={vehicleCounts}
                  onManualChange={handleManualChange}
                  loading={loading[lane]}
                  started={true}
                />
              </motion.div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}

export default Dashboard;