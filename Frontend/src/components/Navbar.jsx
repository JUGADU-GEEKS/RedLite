import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Github, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ darkMode, toggleDarkMode }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const navItems = [
        { label: 'Home', onClick: () => navigate('/') },
        { label: 'Dashboard', onClick: () => navigate('/dashboard') },
        { label: 'Map', onClick: () => navigate('/map') },
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 ${
            darkMode 
            ? 'bg-gradient-to-r from-[#0B0F1A]/95 via-[#171418]/95 to-[#0B0F1A]/95' 
            : 'bg-white/95'
        } backdrop-blur-md border-b ${darkMode ? 'border-red-900/20' : 'border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <motion.div
                        className="flex items-center space-x-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
                            <img 
                                src="/logo.png" 
                                alt="Logo" 
                                className="relative w-8 h-8 rounded-full shadow-lg bg-black"
                            />
                        </div>
                        <span className={`text-xl font-bold tracking-wide bg-gradient-to-r ${
                            darkMode 
                            ? 'from-red-500 via-orange-400 to-yellow-500' 
                            : 'from-red-600 via-orange-500 to-yellow-600'
                        } bg-clip-text text-transparent`} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                            Red Light
                        </span>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        <motion.div
                            className="flex items-center space-x-1"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            {navItems.map((item, index) => (
                                <motion.a
                                    key={item.label}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        item.onClick();
                                    }}
                                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                                        darkMode 
                                        ? 'text-gray-300 hover:text-white hover:bg-red-500/10' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-red-50'
                                    } font-medium relative overflow-hidden group`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="relative z-10">{item.label}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                                </motion.a>
                            ))}
                        </motion.div>

                        <div className="flex items-center space-x-3">
                            <motion.button
                                onClick={toggleDarkMode}
                                className={`p-2 rounded-lg ${
                                    darkMode 
                                    ? 'bg-[#171418] text-yellow-400 hover:bg-[#1a1719]' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                } transition-all duration-300 hover:scale-110`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </motion.button>

                            <motion.a
                                href="https://github.com/JUGADU-GEEKS/RedLite"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                                    darkMode 
                                    ? 'bg-[#171418] text-gray-300 hover:text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                                }`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="GitHub Repository"
                            >
                                <Github size={18} />
                            </motion.a>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <motion.button
                        className="md:hidden p-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-400 text-white"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        initial={false}
                        animate={{ rotate: isMenuOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </motion.button>
                </div>

                {/* Mobile Navigation */}
                <motion.div
                    className="md:hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                        height: isMenuOpen ? 'auto' : 0,
                        opacity: isMenuOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {isMenuOpen && (
                        <div className="py-3 space-y-1">
                            {navItems.map((item, index) => (
                                <motion.a
                                    key={item.label}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        item.onClick();
                                        setIsMenuOpen(false);
                                    }}
                                    className={`block px-4 py-2 rounded-lg text-center ${
                                        darkMode 
                                        ? 'text-gray-300 hover:text-white hover:bg-red-500/10' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-red-50'
                                    } transition-colors duration-300`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    {item.label}
                                </motion.a>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </nav>
    );
};

export default Navbar;