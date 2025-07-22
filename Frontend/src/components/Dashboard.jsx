import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Camera, Eye, Signal
} from 'lucide-react';
import Navbar from './Navbar';

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

function TrafficLight({ signal }) {
  const colorMap = {
    red: ['red', 'gray', 'gray'],
    yellow: ['gray', 'yellow', 'gray'],
    green: ['gray', 'gray', 'green'],
  };
  const tailwindColor = {
    red: 'bg-red-500 shadow-red-500/50 animate-pulse',
    yellow: 'bg-yellow-400 shadow-yellow-400/50 animate-pulse',
    green: 'bg-green-500 shadow-green-500/50 animate-pulse',
    gray: 'bg-gray-600 opacity-40',
  };
  const colors = colorMap[signal] || ['gray', 'gray', 'gray'];
  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="bg-white/80 backdrop-blur-md rounded-lg p-2 flex flex-col gap-1 shadow-xl border border-gray-200">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${tailwindColor[colors[i]]}`} />
        ))}
      </div>
    </div>
  );
}

function LaneCard({
  lane, video, data, light, currentGreen, lastGreenTime, vehicleCounts, onManualChange, loading, started, darkMode
}) {
  const Icon = laneDetails[lane].icon;
  // Helper for color classes
  const colorClass = (val) => {
    if (val === 'green') return 'bg-green-600 text-white px-2 rounded';
    if (val === 'red') return 'bg-red-600 text-white px-2 rounded';
    if (val === 'yellow') return 'bg-yellow-400 text-black px-2 rounded';
    return '';
  };
  const isCurrentGreen = currentGreen === lane;
  return (
    <motion.div
      className={`relative w-full max-w-md h-auto bg-white border-2 border-gradient-to-r ${laneDetails[lane].color} backdrop-blur-sm rounded-3xl p-6 shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <TrafficLight signal={light} />
      <div className="flex items-center justify-center mb-6">
        <div className={`w-12 h-12 bg-gradient-to-r ${laneDetails[lane].color} rounded-full flex items-center justify-center shadow-lg ${isCurrentGreen ? 'ring-4 ring-green-400' : ''}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{laneDetails[lane].label}</h3>
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lane {videoFiles.findIndex(v => v.lane === lane) + 1}</span>
          </div>
        </div>
      </div>
      <div className="relative rounded-2xl overflow-hidden">
        {started && data && data.frame ? (
          <img
            src={`data:image/jpeg;base64,${data.frame}`}
            alt={`Detected Frame for ${video}`}
            className="w-full h-48 object-cover bg-black"
          />
        ) : (
          <video
            src={`/Videos/${video}`}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-48 object-cover bg-black"
          />
        )}
        <div className="absolute top-3 right-3">
          <div className="bg-green-500/90 backdrop-blur-sm rounded-full p-2 animate-pulse">
            <Eye className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4">
        <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : data && data.frame ? 'bg-green-400' : 'bg-gray-500'}`} />
      </div>
      <button
        onClick={() => onManualChange(lane)}
        className="mt-4 px-4 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-sm"
      >
        Change Manually
      </button>
      {/* Stats Section */}
      {started && (
        <div className={`flex flex-col gap-2 mt-4 text-lg items-center w-full ${darkMode ? 'bg-[#181e26]/90 rounded-xl p-4' : ''}`}>
          <div className="font-semibold text-center" style={{ color: darkMode ? '#fff' : '#222' }}>
            Total Vehicles: <span className="font-bold" style={{ color: '#ec4899' }}>{data?.total || 0}</span>
          </div>
          <div className="font-semibold text-center" style={{ color: darkMode ? '#fff' : '#222' }}>
            Signal: <span className={`font-bold capitalize ${colorClass(light)}`}>{light}</span>
          </div>
          <div className="font-semibold text-center" style={{ color: darkMode ? '#fff' : '#222' }}>
            Current Green: <span className={`font-mono ${isCurrentGreen ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{isCurrentGreen ? 'Yes' : currentGreen || '-'}</span>
          </div>
          <div className="font-semibold text-center" style={{ color: darkMode ? '#fff' : '#222' }}>
            Last Green Time: <span className="font-mono" style={{ color: isCurrentGreen ? '#facc15' : '#aaa' }}>{isCurrentGreen ? lastGreenTime : '-'}</span>
          </div>
          <div className="font-semibold text-center" style={{ color: darkMode ? '#fff' : '#222' }}>
            All Vehicle Counts:
            <span className="block font-mono" style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{vehicleCounts ? JSON.stringify(vehicleCounts) : '-'}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color = "red", darkMode, delay = 0 }) => {
  return (
    <motion.div
      className={`${darkMode ? 'bg-[#171418] border-2 border-gradient-to-r from-red-500 to-orange-400' : 'bg-white border-2 border-gradient-to-r from-red-400 to-orange-300'} rounded-xl p-6 backdrop-blur-sm hover:shadow-xl ${darkMode ? 'hover:shadow-red-500/10' : 'hover:shadow-red-500/10'} transition-all duration-300`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -5, scale: 1.05 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{title}</h3>
        <span className={`w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-orange-400 to-yellow-400 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </span>
      </div>
      <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    </motion.div>
  );
};

function Dashboard({ darkMode, toggleDarkMode, onHowItWorksClick, onHomeClick, onDashboardClick }) {
  const [videoData, setVideoData] = useState({});
  const [lights, setLights] = useState({});
  const [currentGreen, setCurrentGreen] = useState(null);
  const [lastGreenTime, setLastGreenTime] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState({});
  const wsRef = useRef(null);

  const startDetection = () => {
    if (wsRef.current) return;
    setStarted(true);
    const ws = new WebSocket('ws://localhost:8000/ws/detect');
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

  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Helper for formatting last green time as relative
  const formatLastGreenAgo = (t) => {
    if (!t) return '-';
    const secondsAgo = Math.floor((Date.now() / 1000) - t);
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  // Helper: Count active lanes
  const getActiveLanes = () => Object.values(videoData).filter(d => d && d.frame).length;
  // Helper: Countdown (seconds since last green)
  const getCountdown = () => {
    if (!lastGreenTime) return 0;
    const secondsAgo = Math.floor((Date.now() / 1000) - lastGreenTime);
    return secondsAgo > 0 ? secondsAgo : 0;
  };
  // Helper: Current green lane label
  const getCurrentGreenLabel = () => {
    if (!currentGreen) return 'None';
    return currentGreen.charAt(0).toUpperCase() + currentGreen.slice(1) + ' Lane';
  };
  // Helper: Next green lane label (cycle order not tracked, so just show 'None')
  const getNextGreenLabel = () => 'None';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-[#15171C] via-red-950/30 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-red-50 to-gray-50'} flex flex-col items-center p-4 transition-colors duration-500`} style={darkMode ? { backgroundColor: '#171418', paddingTop: '5.5rem' } : { paddingTop: '5.5rem' }}>
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onHowItWorksClick={onHowItWorksClick} onHomeClick={onHomeClick} onDashboardClick={onDashboardClick} />
      <h1 className={`text-4xl font-bold text-center text-transparent bg-clip-text ${darkMode ? 'bg-gradient-to-r from-[#7C818C] via-[#493A45] to-orange-200' : 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500'} mt-8 mb-6 font-serif`}>Red Light Dashboard</h1>
      <p className={`text-lg max-w-2xl mx-auto text-center mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Real-time vehicle detection and traffic flow analysis using advanced YOLO computer vision technology
      </p>
      {!started && (
        <>
          <motion.button
            onClick={startDetection}
            className="mb-10 px-8 py-3 bg-pink-600 text-white rounded-full shadow-lg hover:bg-pink-700 transition text-lg font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Start Detection
          </motion.button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videoFiles.map(({ file, lane }) => (
              <LaneCard
                key={file}
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
                darkMode={darkMode}
              />
            ))}
          </div>
        </>
      )}
      {started && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {videoFiles.map(({ file, lane }) => (
            <LaneCard
              key={file}
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
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
