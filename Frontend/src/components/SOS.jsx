import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import emer from '../assets/emer.mp4';
import { getUser, getAuthHeaders } from '../services/auth';

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
  const { t } = useTranslation(['pages', 'common']);
  const navigate = useNavigate();
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
    setMessage(t('pages:sos.alertTriggered'));

    try {
      // Resolve location: try live geolocation first, else fallback to captured coords
      const getPosition = () => new Promise((resolve, reject) => {
        if (!navigator || !navigator.geolocation) return reject(new Error('Geolocation not available'));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 7000 }
        );
      });

      let latitude = coords.lat;
      let longitude = coords.lon;
      try {
        const p = await getPosition();
        latitude = p.latitude;
        longitude = p.longitude;
        setCoords({ lat: latitude, lon: longitude });
      } catch (err) {
        // keep existing coords or undefined; backend will accept numbers
        if (latitude == null || longitude == null) {
          // attempt backend fallback
          try {
            const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '';
            const r = await fetch(`${API_BASE}/get_traffic_coords`);
            if (r.ok) {
              const jd = await r.json();
              const c = jd.coordinates;
              if (c && c.lat != null) {
                latitude = c.lat;
                longitude = c.lon;
                setCoords({ lat: latitude, lon: longitude });
              }
            }
          } catch (e) {
            console.warn('No fallback coords available for SOS:', e);
          }
        }
      }

      const user = getUser();
      const payload = {
        userId: user?.userId || user?.id || 'anonymous',
        userName: user?.name || user?.fullName || user?.username || 'Anonymous',
        phone: user?.phone || user?.mobile || '',
        vehicle: user?.vehicleId || user?.ambulanceInfo?.vehicleId || user?.vehicle || 'not provided',
        latitude: latitude || 0,
        longitude: longitude || 0
      };

      // POST to new SOS endpoint
      const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '';
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_BASE}/sos/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Server error: ${res.status} ${txt}`);
      }

      const body = await res.json();
      if (body && body.status === 'success') {
        const caseId = body.caseId;
        const notifiedCount = (body.notified && body.notified.length) || (body.sms && body.sms.length) || 0;
        setIsActivated(true);
        setMessage(`${t('pages:sos.sosSent')} ${caseId}. ${t('pages:sos.notified')} ${notifiedCount} ${t('pages:sos.contacts')}`);
        playSirenSound();

        // Show detailed SMS results in console and a compact UI debug block
        console.log('[SOS] server response:', body);
        if (body.sms) {
          // Attach a readable debug message to inform whether sends were accepted
          const smsDebug = body.sms.map(s => `${s.phone}: ${s.status}${s.sid ? ` (sid: ${s.sid})` : s.error ? ` (error)` : ''}`);
          setMessage(prev => prev + '\n' + smsDebug.join('\n'));
        }

        // Persist caseId to localStorage so the citizen dashboard can detect acknowledgement
        try {
          const stored = JSON.parse(localStorage.getItem('lanezy_sos_cases') || '[]');
          const user = getUser();
          stored.push({ caseId, userId: user?.userId || user?.id || 'anonymous' });
          localStorage.setItem('lanezy_sos_cases', JSON.stringify(stored));
        } catch (e) {
          console.warn('Failed to persist caseId locally', e);
        }

        // Auto-reset visual state after 15s (but do not show acknowledgement here)
        setTimeout(() => {
          setIsActivated(false);
        }, 15000);
      } else {
        setMessage(`❌ ${t('pages:sos.failedToTrigger')} ${body?.message || t('common:error')}`);
      }
    } catch (err) {
      console.error('SOS activation error:', err);
      setMessage(`❌ ${t('pages:sos.failedToTrigger')} ${err.message || t('common:error')}`);
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
                  Emergency Tow Service
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
                {t('pages:sos.forCriticalUse')}
              </span>
              <br />
              <span className="text-lg text-gray-500 mt-2 block">
                {t('pages:sos.useOnly')}
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
                      <span className="text-xl">{t('pages:sos.activating')}</span>
                    </motion.div>
                  ) : isActivated ? (
                    <div className="flex flex-col items-center">
                      <Shield className="w-16 h-16 mb-4" />
                      <span className="text-xl">{t('pages:sos.sosActivated')}</span>
                      <span className="text-sm mt-2">{t('pages:sos.helpOnWay')}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-m">{t('pages:sos.triggerSOS')}</span>
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