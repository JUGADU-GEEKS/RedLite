import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import HowItWorks from './HowItWorks';
import MapPage from './map';
import Team from './team';
import hero from "../assets/hero.mp4";

import { BarChart3, Clock, Zap, TrendingUp, ChevronDown } from 'lucide-react';

// Enhanced Traffic Light Component with softer aesthetics
const TrafficLight = ({ delay = 0 }) => {
  const [activeLight, setActiveLight] = useState(1);

  React.useEffect(() => {
    const interval = setInterval(() => {1
      setActiveLight((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200/30 to-orange-200/30 rounded-2xl blur-lg transform scale-110"></div>

      {/* Traffic light body */}
      <div className="relative w-8 h-20 bg-gradient-to-b from-gray-600 to-gray-800 rounded-2xl flex flex-col items-center justify-center space-y-2 p-2 shadow-xl border border-gray-300/50">
        <div className={`w-4 h-4 rounded-full transition-all duration-500 ${activeLight === 0
          ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-400/60 scale-110'
          : 'bg-gray-300/60'
          }`}>
          {activeLight === 0 && (
            <div className="w-full h-full bg-red-300/30 rounded-full animate-ping absolute"></div>
          )}
        </div>
        <div className={`w-4 h-4 rounded-full transition-all duration-500 ${activeLight === 1
          ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-400/60 scale-110'
          : 'bg-gray-300/60'
          }`}>
          {activeLight === 1 && (
            <div className="w-full h-full bg-amber-300/30 rounded-full animate-ping absolute"></div>
          )}
        </div>
        <div className={`w-4 h-4 rounded-full transition-all duration-500 ${activeLight === 2
          ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-400/60 scale-110'
          : 'bg-gray-300/60'
          }`}>
          {activeLight === 2 && (
            <div className="w-full h-full bg-emerald-300/30 rounded-full animate-ping absolute"></div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Floating elements for background decoration
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{
      y: [-10, 10, -10],
      rotate: [-2, 2, -2],
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

const Landing = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showTeam, setShowTeam] = useState(false);

  const navigate = (path) => {
    // Mock navigation function
    console.log(`Navigating to ${path}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements */}
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

      <Navbar
        onHowItWorksClick={() => { setShowHowItWorks(true); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
        onHomeClick={() => { setShowHowItWorks(false); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
        onDashboardClick={() => { setShowDashboard(true); setShowHowItWorks(false); setShowMap(false); setShowTeam(false); }}
        onMapClick={() => { setShowMap(true); setShowDashboard(false); setShowHowItWorks(false); setShowTeam(false); }}
        onTeamClick={() => { setShowTeam(true); setShowDashboard(false); setShowHowItWorks(false); setShowMap(false); }}
      />

      {showDashboard ? (
        <Dashboard />
      ) : showHowItWorks ? (
        <HowItWorks />
      ) : showMap ? (
        <MapPage />
      ) : showTeam ? (
        <Team />
      ) : (
        <>
          {/* Enhanced Hero Section */}
          <div className="pt-32 pb-20 px-6 relative z-10">
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
              {/* Left: Enhanced Text */}
              <div className="text-center md:text-left space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif leading-tight">
                    Lanezy
                  </h1>
                  <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto md:mx-0 mb-8"></div>
                </motion.div>

                <motion.p
                  className="text-xl md:text-2xl mb-10 max-w-xl text-gray-600 leading-relaxed font-light"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  Revolutionizing traffic management with{' '}
                  <span className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    AI-powered vehicle detection
                  </span>{' '}
                  and intelligent flow optimization
                </motion.p>

                <motion.div
                  className="flex flex-wrap justify-center md:justify-start gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  <motion.button
                    className="group px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-semibold shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 border border-white/20"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/dashboard')}
                  >
                    <span className="flex items-center space-x-2">
                      <a href='/dashboard'>Get Started</a>
                      <motion.span
                        className="group-hover:translate-x-1 transition-transform duration-300"
                      >
                        →
                      </motion.span>
                    </span>
                  </motion.button>

                  <motion.button
                    className="px-10 py-5 rounded-2xl bg-white/80 backdrop-blur-sm text-gray-700 font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:bg-white/90"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/team')}
                  >
                    <span className="flex items-center space-x-2">
                      <a href='/team'>Our Team</a>
                      <motion.span
                        className="group-hover:translate-x-1 transition-transform duration-300"
                      >
                        →
                      </motion.span>
                    </span>
                  </motion.button>


                </motion.div>
              </div>

              {/* Right: Enhanced Video Container */}
              <motion.div
                className="flex justify-center md:justify-end"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="relative">
                  {/* Glow effect behind video */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-3xl blur-2xl transform scale-110"></div>

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
                        >
                          <source src={hero} type="video/mp4" />
                        </video>
                      </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Enhanced Traffic Lights Section */}
          <motion.div
            className="relative py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-96 h-24 bg-gradient-to-r from-amber-200/10 to-orange-200/10 rounded-full blur-xl"></div>
            </div>

            {/* Traffic lights with enhanced spacing and presentation */}
            <div className="relative flex justify-center items-center space-x-16">
              <div className="flex flex-col items-center space-y-4">
                <TrafficLight delay={0.1} />
                <motion.p
                  className="text-sm text-gray-800 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Lane 1
                </motion.p>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <TrafficLight delay={0.2} />
                <motion.p
                  className="text-sm text-gray-800 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  Lane 2
                </motion.p>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <TrafficLight delay={0.3} />
                <motion.p
                  className="text-sm text-gray-800 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  Lane 3
                </motion.p>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <TrafficLight delay={0.3} />
                <motion.p
                  className="text-sm text-gray-800 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  Lane 4
                </motion.p>
              </div>
            </div>

            {/* Subtitle */}
            <motion.p
              className="text-center mt-12 text-lg text-black font-light max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
            >
              Real-time adaptive control for optimal traffic flow
            </motion.p>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Landing;