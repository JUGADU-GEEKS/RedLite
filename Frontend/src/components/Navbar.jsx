import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ darkMode, toggleDarkMode }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const userRaw = localStorage.getItem('lanezy_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role = user?.role || 'user';

    const handleLogout = () => {
        localStorage.removeItem('lanezy_token');
        localStorage.removeItem('lanezy_user');
        navigate('/');
    };

    let navItems = [];
    if (role === 'ambulance_driver') {
        // Ambulance Driver: Tow Help, Logout
        navItems = [
            { label: 'Tow Help', to: '/sos', onClick: () => navigate('/sos') },
        ];
    } else if (role === 'user') {
        // Civilian: Home, Tow Help, Report Issue, Logout
        navItems = [
            { label: 'Home', to: '/home', onClick: () => navigate('/home') },
            { label: 'Tow Help', to: '/sos', onClick: () => navigate('/sos') },
            { label: 'Potholes Map', to: '/potholes-map', onClick: () => navigate('/potholes-map') },
            { label: 'Report Issue', to: '/issue', onClick: () => navigate('/issue') },
            { label: 'Profile', to: '/user-profile', onClick: () => navigate('/user-profile') },
        ];
    } else if (role === 'employee') {
        // Traffic Officer: My Intersections, Wrong Side, Illegal Parking, Logout
        navItems = [
            { label: 'My Intersections', to: '/my-intersections', onClick: () => navigate('/my-intersections') },
            { label: 'Wrong Side', to: '/wrong-side', onClick: () => navigate('/wrong-side') },
            { label: 'Illegal Parking', to: '/illegal-parking', onClick: () => navigate('/illegal-parking') },
        ];
    } else if (role === 'admin') {
        // Admin: all routes visible except /dashboard
        navItems = [
            { label: 'Home', to: '/home', onClick: () => navigate('/home') },
            { label: 'Manage Intersections', to: '/admin/intersections', onClick: () => navigate('/admin/intersections') },
            // { label: 'Wrong Side', to: '/wrong-side', onClick: () => navigate('/wrong-side') },
            // { label: 'Illegal Parking', to: '/illegal-parking', onClick: () => navigate('/illegal-parking') },
            // { label: 'Tow Help', to: '/sos', onClick: () => navigate('/sos') },
            // { label: 'Map', to: '/map', onClick: () => navigate('/map') },
            { label: 'Potholes Map', to: '/potholes-map', onClick: () => navigate('/potholes-map') },
            { label: 'Approvals', to: '/authority/dashboard', onClick: () => navigate('/authority/dashboard') },
            // Intentionally omit Dashboard route
        ];
    } else {
        // Default fallback (unauthenticated or unknown role): minimal
        navItems = [
            { label: 'Home', to: '/home', onClick: () => navigate('/home') },
        ];
    }

    if (localStorage.getItem('lanezy_token')) {
        // navItems.push({ label: 'Profile', to: '/user-profile', onClick: () => navigate('/user-profile') });
        navItems.push({ label: 'Logout', to: '/', onClick: handleLogout });
    }

    // Keep main navbar theme as a light orange glass shade with a soft glow
    // increased transparency for stronger glass effect
    const containerClasses = darkMode
        ? 'bg-orange-900/12 border border-orange-700/10 text-gray-100'
        : 'bg-orange-50/40 border border-orange-200/30 text-gray-800';

    return (
        <nav className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto px-2 pointer-events-auto">
                <div className="relative">
                    {/* Soft gradient glow behind navbar */}
                    <div
                        className={darkMode ? 'absolute -inset-0.5 rounded-3xl opacity-48 bg-gradient-to-r from-orange-600 to-yellow-300' : 'absolute -inset-0.5 rounded-3xl opacity-48 bg-gradient-to-r from-orange-300 to-yellow-200'}
                        style={{ filter: 'blur(44px)' }}
                    />

                    <div className={`relative flex items-center justify-between h-14 rounded-3xl px-4 backdrop-blur-xl shadow-lg ${containerClasses}`} style={{ backdropFilter: 'blur(24px)' }}>
                        <div className="flex items-center space-x-3">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-yellow-300 rounded-full opacity-55 group-hover:opacity-100 transition duration-500 blur-md" />
                                <img src="/logo.png" alt="Logo" className="relative w-8 h-8 rounded-full shadow-lg bg-black" />
                            </div>

                            <span
                                className={`text-xl font-bold tracking-wide bg-gradient-to-r ${darkMode ? 'from-red-500 via-orange-400 to-yellow-500' : 'from-red-600 via-orange-500 to-yellow-600'} bg-clip-text text-transparent cursor-pointer`}
                                onClick={() => navigate('/')}
                            >
                                Lanezy
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center space-x-1">
                                {navItems.map((item) => {
                                    const isActive = item.to && location.pathname === item.to;
                                    return (
                                        <motion.a
                                            key={item.label}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                item.onClick();
                                            }}
                                            className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${isActive ? (darkMode ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md' : 'bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-md') : (darkMode ? 'text-gray-300 hover:text-white hover:bg-orange-500/8' : 'text-gray-700 hover:text-gray-900 hover:bg-orange-50/60')
                                                }`}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <span className="relative z-10">{item.label}</span>
                                        </motion.a>
                                    );
                                })}

                                {/* GitHub link removed per request */}

                                {localStorage.getItem('lanezy_token') ? (
                                    <motion.button
                                        onClick={() => navigate('/user-profile')}
                                        className={darkMode ? 'p-2 rounded-lg bg-orange-800/12 text-gray-300 hover:text-white' : 'p-2 rounded-lg bg-orange-100/60 text-gray-600 hover:text-gray-900'}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label="Profile"
                                    >
                                        <User size={18} />
                                    </motion.button>
                                ) : null}
                            </div>

                            <motion.button
                                className="md:hidden p-1.5 rounded-lg bg-gradient-to-r from-orange-400 to-yellow-300 text-white"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                initial={false}
                                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </motion.button>
                        </div>

                        {/* Mobile Menu (collapsible) */}
                        <motion.div
                            className="md:hidden"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {isMenuOpen && (
                                <div className={`${darkMode ? 'bg-orange-900/18' : 'bg-orange-50/30'} mt-2 py-3 space-y-1 rounded-b-2xl`}>
                                    {navItems.map((item, index) => (
                                        <motion.a
                                            key={item.label}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                item.onClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`block px-4 py-2 rounded-lg text-center ${item.to && location.pathname === item.to ? (darkMode ? 'bg-orange-600 text-white' : 'bg-orange-400 text-white') : (darkMode ? 'text-gray-300 hover:text-white hover:bg-orange-500/8' : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50/60')
                                                } transition-colors duration-300`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            {item.label}
                                        </motion.a>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;