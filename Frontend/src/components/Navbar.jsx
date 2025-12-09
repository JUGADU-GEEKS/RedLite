import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageNavigation } from '../hooks/useLanguageNavigation';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = ({ darkMode, toggleDarkMode }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(['navbar', 'common']);
    const { navigateTo, getLanguagePath } = useLanguageNavigation();

    const userRaw = localStorage.getItem('lanezy_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role = user?.role || 'user';

    const handleLogout = () => {
        localStorage.removeItem('lanezy_token');
        localStorage.removeItem('lanezy_user');
        const currentLang = window.location.pathname.match(/^\/(en|hi|od)/)?.[1] || 'en';
        navigate(currentLang === 'en' ? '/' : `/${currentLang}/`);
    };

    let navItems = [];
    if (role === 'ambulance_driver') {
        // Ambulance Driver: Tow Help, Logout
        navItems = [
            { label: t('navbar:towHelp'), to: '/sos', onClick: () => navigateTo('/sos') },
        ];
    } else if (role === 'user') {
        // Civilian: Home, Tow Help, Report Issue, Logout
        navItems = [
            { label: t('navbar:home'), to: '/home', onClick: () => navigateTo('/home') },
            { label: t('navbar:towHelp'), to: '/sos', onClick: () => navigateTo('/sos') },
            { label: t('navbar:potholesMap'), to: '/potholes-map', onClick: () => navigateTo('/potholes-map') },
            { label: t('navbar:reportIssue'), to: '/issue', onClick: () => navigateTo('/issue') },
            { label: t('navbar:profile'), to: '/user-profile', onClick: () => navigateTo('/user-profile') },
        ];
    } else if (role === 'employee') {
        // Traffic Officer: My Intersections, Wrong Side, Illegal Parking, Logout
        navItems = [
            { label: t('navbar:myIntersections'), to: '/my-intersections', onClick: () => navigateTo('/my-intersections') },
            { label: t('navbar:wrongSide'), to: '/wrong-side', onClick: () => navigateTo('/wrong-side') },
            { label: t('navbar:illegalParking'), to: '/illegal-parking', onClick: () => navigateTo('/illegal-parking') },
        ];
    } else if (role === 'admin') {
        // Admin: all routes visible except /dashboard
        navItems = [
            { label: t('navbar:home'), to: '/home', onClick: () => navigateTo('/home') },
            { label: t('navbar:manageIntersections'), to: '/admin/intersections', onClick: () => navigateTo('/admin/intersections') },
            { label: t('navbar:potholesMap'), to: '/potholes-map', onClick: () => navigateTo('/potholes-map') },
            { label: t('navbar:approvals'), to: '/authority/dashboard', onClick: () => navigateTo('/authority/dashboard') },
        ];
    } else {
        // Default fallback (unauthenticated or unknown role): minimal
        navItems = [
            { label: t('navbar:home'), to: '/home', onClick: () => navigateTo('/home') },
        ];
    }

    if (localStorage.getItem('lanezy_token')) {
        navItems.push({ label: t('navbar:logout'), to: '/', onClick: handleLogout });
    }

    // Keep main navbar theme as a light orange glass shade with a soft glow
    // increased transparency for stronger glass effect
    const containerClasses = darkMode
        ? 'bg-orange-900/12 border border-orange-700/10 text-gray-100'
        : 'bg-orange-50/40 border border-orange-200/30 text-gray-800';

    return (
        <nav className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto px-1 sm:px-2 pointer-events-auto">
                <div className="relative">
                    {/* Soft gradient glow behind navbar */}
                    <div
                        className={darkMode ? 'absolute -inset-0.5 rounded-3xl opacity-48 bg-gradient-to-r from-orange-600 to-yellow-300' : 'absolute -inset-0.5 rounded-3xl opacity-48 bg-gradient-to-r from-orange-300 to-yellow-200'}
                        style={{ filter: 'blur(44px)' }}
                    />

                    <div className={`relative flex items-center justify-between h-12 sm:h-14 rounded-3xl px-2 sm:px-4 backdrop-blur-xl shadow-lg ${containerClasses}`} style={{ backdropFilter: 'blur(24px)' }}>
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
                            <div className="relative group flex-shrink-0">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-yellow-300 rounded-full opacity-55 group-hover:opacity-100 transition duration-500 blur-md" />
                                <img src="/logo.png" alt="Logo" className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg bg-black" />
                            </div>

                            <span
                                className={`text-lg sm:text-xl font-bold tracking-wide bg-gradient-to-r ${darkMode ? 'from-red-500 via-orange-400 to-yellow-500' : 'from-red-600 via-orange-500 to-yellow-600'} bg-clip-text text-transparent cursor-pointer whitespace-nowrap`}
                                onClick={() => {
                                    const currentLang = window.location.pathname.match(/^\/(en|hi|od)/)?.[1] || 'en';
                                    navigate(currentLang === 'en' ? '/' : `/${currentLang}/`);
                                }}
                            >
                                {t('common:appName')}
                            </span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0">
                            <LanguageSwitcher />
                            <div className="flex items-center space-x-0.5 lg:space-x-1 flex-wrap justify-end">
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
                                            className={`px-2 lg:px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm lg:text-base whitespace-nowrap ${isActive ? (darkMode ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md' : 'bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-md') : (darkMode ? 'text-gray-300 hover:text-white hover:bg-orange-500/8' : 'text-gray-700 hover:text-gray-900 hover:bg-orange-50/60')
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
                                        onClick={() => navigateTo('/user-profile')}
                                        className={darkMode ? 'p-2 rounded-lg bg-orange-800/12 text-gray-300 hover:text-white flex-shrink-0' : 'p-2 rounded-lg bg-orange-100/60 text-gray-600 hover:text-gray-900 flex-shrink-0'}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label={t('navbar:profile')}
                                    >
                                        <User size={18} />
                                    </motion.button>
                                ) : null}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <motion.button
                            className="md:hidden p-1.5 rounded-lg bg-gradient-to-r from-orange-400 to-yellow-300 text-white flex-shrink-0 ml-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            initial={false}
                            animate={{ rotate: isMenuOpen ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </motion.button>
                    </div>

                    {/* Mobile Menu (collapsible) */}
                    <motion.div
                        className="md:hidden absolute top-full left-0 right-0 mt-2 overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ pointerEvents: isMenuOpen ? 'auto' : 'none' }}
                    >
                        {isMenuOpen && (
                            <div className={`${darkMode ? 'bg-orange-900/18' : 'bg-orange-50/30'} py-3 space-y-1 rounded-b-2xl backdrop-blur-xl border-t ${darkMode ? 'border-orange-700/10' : 'border-orange-200/30'}`}>
                                <div className="px-4 py-2">
                                    <LanguageSwitcher />
                                </div>
                                {navItems.map((item, index) => {
                                    const isActive = location.pathname.includes(item.to);
                                    return (
                                        <motion.a
                                            key={item.label}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                item.onClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`block px-4 py-2.5 rounded-lg text-center text-sm sm:text-base ${isActive ? (darkMode ? 'bg-orange-600 text-white' : 'bg-orange-400 text-white') : (darkMode ? 'text-gray-300 hover:text-white hover:bg-orange-500/8' : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50/60')
                                                } transition-colors duration-300`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            {item.label}
                                        </motion.a>
                                    );
                                })}
                                {localStorage.getItem('lanezy_token') && (
                                    <motion.button
                                        onClick={() => {
                                            navigateTo('/user-profile');
                                            setIsMenuOpen(false);
                                        }}
                                        className={`w-full px-4 py-2.5 rounded-lg text-center text-sm sm:text-base ${darkMode ? 'text-gray-300 hover:text-white hover:bg-orange-500/8' : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50/60'} transition-colors duration-300 flex items-center justify-center gap-2`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: navItems.length * 0.05 }}
                                    >
                                        <User size={18} />
                                        <span>{t('navbar:profile')}</span>
                                    </motion.button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;