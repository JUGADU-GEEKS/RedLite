import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Shield } from 'lucide-react';

// Floating elements for background decoration (same as landing page)
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

function UserWho() {
  const navigate = useNavigate();

  const handleCivilianClick = () => {
    // Send the intended post-login redirect so UserAuth can forward the user
    navigate('/user-login', { state: { redirectTo: '/home' } });
  };

  const handleTrafficOfficerClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements (same as landing page) */}
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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md mx-auto">
          {/* Welcome Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif leading-tight">
              Welcome
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-8"></div>
            <p className="text-xl text-gray-600 leading-relaxed">
              to <span className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Lanezy</span> Traffic Management System
            </p>
          </motion.div>

          {/* Role Selection Box */}
          <motion.div
            className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              You're a
            </h2>

            <div className="space-y-6">
              {/* Civilian Button */}
              <motion.button
                onClick={handleCivilianClick}
                className="w-full group px-8 py-6 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-400 text-white font-semibold shadow-2xl shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-300 border border-white/20"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <User className="w-6 h-6" />
                  <span className="text-xl">Civilian</span>
                  <motion.span
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  >
                    →
                  </motion.span>
                </div>
                <p className="text-sm text-yellow-100 mt-2 opacity-90">
                  Access traffic updates and report issues
                </p>
              </motion.button>

              {/* Traffic Officer Button */}
              <motion.button
                onClick={handleTrafficOfficerClick}
                className="w-full group px-8 py-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-semibold shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 border border-white/20"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Shield className="w-6 h-6" />
                  <span className="text-xl">Traffic Officer</span>
                  <motion.span
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  >
                    →
                  </motion.span>
                </div>
                <p className="text-sm text-orange-100 mt-2 opacity-90">
                  Manage traffic systems and controls
                </p>
              </motion.button>
            </div>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <p className="text-gray-500 text-sm">
              Select your role to continue with the appropriate interface
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default UserWho;