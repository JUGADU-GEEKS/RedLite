import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowLeft } from 'lucide-react';

// Floating elements for background decoration (same as user_who page)
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

function Login() {
  const navigate = useNavigate();
  const [policeId, setPoliceId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Redirect to home page
    navigate('/home');
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements (same as user_who page) */}
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

      {/* Back Button */}
      <motion.button
        onClick={handleBackClick}
        className="absolute top-8 left-8 z-20 flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md mx-auto">
          {/* Login Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
              <h3 className="font-semibold text-gray-700 mb-2">Authorized Personnel Only</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                This portal provides access to traffic light controls, emergency overrides, 
                vehicle detection systems, and real-time traffic monitoring. 
                All activities are logged for security purposes.
              </p>
            </div>
          </motion.div>

          {/* Login Form */}
          <motion.div
            className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Secure Access Portal
            </h2>
            <p className="text-center text-gray-600 mb-8 text-sm">
              Enter your credentials to manage traffic systems
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Police ID Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <label className="block text-gray-700 font-semibold mb-2">
                  Police ID Number
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={policeId}
                    onChange={(e) => setPoliceId(e.target.value)}
                    placeholder="Enter your police ID"
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <label className="block text-gray-700 font-semibold mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
              </motion.div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full px-8 py-4 rounded-2xl font-semibold shadow-2xl transition-all duration-300 border border-white/20 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white hover:shadow-orange-500/40 transform hover:scale-[1.02] hover:-translate-y-1'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xl">Access Dashboard</span>
                    <span>→</span>
                  </div>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Login;
