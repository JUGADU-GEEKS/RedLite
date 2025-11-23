import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LaneCard from '../components/LaneCard';
import { useAuth } from '../services/auth';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';

const LaneDashboard = () => {
  const { intersectionId } = useParams();
  const [data, setData] = useState({});
  const [signalStatus, setSignalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth() || {};

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  useEffect(() => {
    const fetchSignalStatus = async () => {
      if (!intersectionId) return;
      
      try {
        const response = await fetch(`${API_BASE}/signal_status/${intersectionId}`);
        if (response.ok) {
          const status = await response.json();
          setSignalStatus(status);
        } else {
          console.warn(`Signal status not found for ${intersectionId}`);
        }
      } catch (error) {
        console.error('Error fetching signal status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignalStatus();
  }, [intersectionId, API_BASE]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/lane_feed`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
      if (message.lights && message.phase) {
        setSignalStatus({
          state: message.lights,
          currentLane: message.lane,
          remainingTime: message.remaining,
          phase: message.phase
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const lanes = ['north', 'south', 'east', 'west'];
  const currentLane = data.lane;
  const remainingSeconds = data.remaining || 0;
  const currentPhase = data.phase || 'red';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Soft gradient orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

      <Navbar />
      <div className="pt-28 px-6 max-w-7xl mx-auto pb-12 relative z-10">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
            Traffic Lane Dashboard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
          <p className="text-lg text-gray-700">
            {intersectionId ? `📍 Intersection: ${intersectionId}` : 'Real-time traffic monitoring'}
          </p>
        </motion.div>

        {/* Signal Status Card */}
        {signalStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 backdrop-blur-sm bg-white/60 border border-white/50 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              <span className="text-3xl">📊</span>
              Signal Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current Lane', value: signalStatus.currentLane || 'None', icon: '🛣️' },
                { 
                  label: 'Phase', 
                  value: signalStatus.phase?.toUpperCase() || 'RED',
                  color: signalStatus.phase === 'green' ? 'text-emerald-600' : signalStatus.phase === 'yellow' ? 'text-amber-600' : 'text-red-600',
                  icon: signalStatus.phase === 'green' ? '🟢' : signalStatus.phase === 'yellow' ? '🟡' : '🔴'
                },
                { label: 'Remaining', value: `${signalStatus.remainingTime || 0}s`, icon: '⏱️' },
                { label: 'Status', value: signalStatus.state ? 'Active' : 'Inactive', icon: '✅' }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/60 hover:border-amber-300/60 transition-all shadow-md hover:shadow-lg"
                >
                  <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
                    <span>{item.icon}</span>
                    {item.label}
                  </p>
                  <p className={`text-xl font-bold text-gray-900 mt-2 ${item.color || ''} capitalize`}>
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cycle Information Card */}
        {data.priority_order && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 backdrop-blur-sm bg-white/60 border border-white/50 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              <span className="text-3xl">⚙️</span>
              Cycle Information
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-white/80 to-orange-50/60 rounded-2xl p-5 border border-white/60">
                <p className="text-sm text-gray-700 mb-3 font-semibold">Priority Order</p>
                <div className="flex flex-wrap gap-3">
                  {data.priority_order.map((lane, idx) => (
                    <motion.span
                      key={idx}
                      whileHover={{ scale: 1.1, y: -2 }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-semibold rounded-xl text-sm capitalize shadow-lg hover:shadow-xl transition-all"
                    >
                      {lane}
                    </motion.span>
                  ))}
                </div>
              </div>
              {data.durations && (
                <div className="bg-gradient-to-r from-white/80 to-yellow-50/60 rounded-2xl p-5 border border-white/60">
                  <p className="text-sm text-gray-700 mb-3 font-semibold">Durations</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.priority_order.map((lane) => (
                      <motion.div 
                        key={lane}
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="bg-white/80 border border-amber-200/50 rounded-xl p-4 text-center hover:border-amber-400/50 transition-all shadow-sm hover:shadow-md"
                      >
                        <p className="text-xs text-gray-700 capitalize font-bold">{lane}</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-1">{data.durations[lane]}s</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Big Timer Display */}
        {currentPhase !== 'red' && remainingSeconds > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12 flex justify-center"
          >
            <div className="relative">
              {/* Animated background glow */}
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl blur-2xl opacity-50"
              />
              
              {/* Main timer card */}
              <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-3xl shadow-2xl p-12 border-4 border-white/40 backdrop-blur-sm">
                <motion.div 
                  className="text-center"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.div 
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-lg font-semibold text-white/90 mb-2 uppercase tracking-widest drop-shadow-lg"
                  >
                    {currentPhase === 'green' ? '🟢 Green Light' : '🟡 Yellow Light'}
                  </motion.div>
                  <motion.div 
                    key={remainingSeconds}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-8xl md:text-9xl font-black text-white drop-shadow-2xl"
                  >
                    {remainingSeconds}
                  </motion.div>
                  <div className="text-xl font-semibold text-white/90 mt-4 capitalize drop-shadow-lg">
                    {currentLane} Lane
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Lane Cards Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {lanes.map((lane, idx) => (
            <motion.div
              key={lane}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
            >
              <LaneCard 
                lane={lane} 
                data={data}
                isActive={currentLane === lane && currentPhase !== 'red'}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default LaneDashboard;
