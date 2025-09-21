import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, Shield, Volume2 } from 'lucide-react';
import Navbar from './Navbar';
import emer from '../assets/emer.mp4';

// Floating elements for background decoration
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  >
    {children}
  </motion.div>
);

const SOS = () => {
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const audioRef = useRef(null);

  const playSirenSound = () => {
    // Create a simple siren sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 5);
  };

  const handleSOSActivation = async () => {
    if (isActivated) return;
    
    setIsLoading(true);
    setMessage('');
    
    try {
      // Send emergency email to police station
      const response = await fetch('http://localhost:8000/send_emergency_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'emergency_sos',
          message: 'EMERGENCY SOS ALERT - Immediate police assistance required',
          location: 'Current traffic intersection'
        })
      });
      
      // In parallel (non-blocking), send a call alert to the backend using available coordinates.
      (async () => {
        try {
          let sendCoords = null;
          if (coords && coords.lat != null) {
            sendCoords = [coords.lat, coords.lon];
          } else {
            // fallback to backend configured traffic coords
            try {
              const r = await fetch('http://localhost:8000/get_traffic_coords');
              if (r.ok) {
                const jd = await r.json();
                const c = jd.coordinates;
                if (c && c.lat != null) sendCoords = [c.lat, c.lon];
              }
            } catch (e) {
              console.warn('Failed to fetch fallback coords for call alert:', e);
            }
          }

          if (sendCoords) {
            await fetch('http://localhost:8000/send_call_alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ coords: sendCoords }),
            });
          } else {
            console.warn('No coordinates available to send call alert');
          }
        } catch (err) {
          console.error('Error sending call alert:', err);
        }
      })();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        setMessage('🚨 Emergency alert sent successfully! Emergency services have been notified.');
        setIsActivated(true);
        
        // Play siren sound
        playSirenSound();
        
        // Reset after 15 seconds
        setTimeout(() => {
          setIsActivated(false);
          setMessage('');
        }, 15000);
      } else {
        setMessage(`❌ Failed to send emergency alert: ${result.message || 'Unknown error'}. Please call emergency services directly at 100.`);
      }
    } catch (error) {
      console.error('Emergency alert error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage('❌ Cannot connect to server. Please call emergency services directly at 100.');
      } else {
        setMessage(`❌ Network error: ${error.message}. Please call emergency services directly at 100.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Capture browser geolocation on mount (optional, used for call alert)
  useEffect(() => {
    if (navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error (SOS):', err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements - same as Landing.jsx and Dashboard.jsx */}
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

      <Navbar />

      {/* Main Content - Two Column Layout */}
      <div className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          
          {/* Left: Emergency Video */}
          <motion.div
            className="flex justify-center md:justify-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <div className="relative">
              {/* Glow effect behind video */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 rounded-3xl blur-2xl transform scale-110"></div>

              {/* Video container with enhanced styling */}
              <div className="relative bg-white/40 backdrop-blur-sm p-4 rounded-3xl shadow-2xl border border-white/50">
                <div className="text-center space-y-4">
                  <video
                    className="rounded-xl"
                    width="600"
                    height="400"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src={emer} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: SOS Content */}
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-red-500 mr-4" />
                <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent font-serif leading-tight">
                  Emergency SOS
                </h1>
              </div>
              <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-8"></div>
            </motion.div>

            <motion.p
              className="text-xl md:text-2xl mb-10 max-w-xl mx-auto text-gray-600 leading-relaxed font-light text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <span className="font-semibold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                For Critical Use Only
              </span>
              <br />
              <span className="text-lg text-gray-500 mt-2 block">
                Use only in real emergencies requiring immediate police assistance
              </span>
            </motion.p>

            {/* SOS Button */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              <div className="relative">
                {/* Pulsing glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-64 h-64 bg-red-500/30 rounded-full blur-xl"></div>
                </motion.div>
                
                {/* Button */}
                <motion.button
                  onClick={handleSOSActivation}
                  disabled={isLoading || isActivated}
                  className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center text-white font-black text-3xl tracking-widest shadow-2xl transition-all duration-300 ${
                    isActivated
                      ? 'bg-gradient-to-br from-green-600 to-green-800 cursor-not-allowed'
                      : isLoading
                      ? 'bg-gradient-to-br from-yellow-600 to-yellow-800 cursor-wait'
                      : 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 cursor-pointer'
                  }`}
                  whileHover={!isLoading && !isActivated ? { scale: 1.05 } : {}}
                  whileTap={!isLoading && !isActivated ? { scale: 0.95 } : {}}
                  animate={!isActivated && !isLoading ? {
                    boxShadow: [
                      '0 0 0 0 rgba(239, 68, 68, 0.7)',
                      '0 0 0 20px rgba(239, 68, 68, 0)',
                      '0 0 0 0 rgba(239, 68, 68, 0)'
                    ]
                  } : {}}
                  transition={{
                    boxShadow: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }
                  }}
                >
                  {isLoading ? (
                    <motion.div
                      className="flex flex-col items-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mb-4"></div>
                      <span className="text-xl">SENDING...</span>
                    </motion.div>
                  ) : isActivated ? (
                    <div className="flex flex-col items-center">
                      <Shield className="w-16 h-16 mb-4" />
                      <span className="text-xl">SENT!</span>
                      <span className="text-sm mt-2">Police Notified</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-2">SOS</span>
                      <span className="text-sm">EMERGENCY</span>
                    </div>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Status Message */}
            {message && (
              <motion.div
                className={`max-w-lg mx-auto p-4 rounded-2xl text-center text-base font-semibold ${
                  message.includes('successfully') 
                    ? 'bg-green-900/80 text-green-100 border border-green-500/50' 
                    : 'bg-red-900/80 text-red-100 border border-red-500/50'
                } backdrop-blur-sm`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {message}
              </motion.div>
            )}

            {/* Emergency Contact Info */}
            <motion.div
              className="grid grid-cols-3 gap-4 max-w-md mx-auto"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-red-200/50">
                <Phone className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-red-600">100</p>
                <p className="text-gray-600 text-xs">Police</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-red-200/50">
                <Phone className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-red-600">108</p>
                <p className="text-gray-600 text-xs">Medical</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-red-200/50">
                <Phone className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-red-600">101</p>
                <p className="text-gray-600 text-xs">Fire</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOS;