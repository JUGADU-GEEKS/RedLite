import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, BarChart3, Clock, Zap, TrendingUp, Users, ChevronDown } from 'lucide-react';
import HowItWorks from './HowItWorks';
import Dashboard from './Dashboard';
import MapPage from './map';
import Team from './team';
import Navbar from "./Navbar";
import { useNavigate } from 'react-router-dom';

// Traffic Light Component
const TrafficLight = ({ darkMode, delay = 0 }) => {
    const [activeLight, setActiveLight] = useState(1);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setActiveLight((prev) => (prev + 1) % 3);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            className="w-6 h-16 bg-gray-800 rounded-full flex flex-col items-center justify-center space-y-1 p-1 shadow-lg"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay }}
        >
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${activeLight === 0 ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${activeLight === 1 ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${activeLight === 2 ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-gray-600'}`}></div>
        </motion.div>
    );
};

// Steps data for How It Works section
const steps = [
  {
    title: 'Live Video Input',
    desc: 'Government provides live video feeds or pre-recorded videos from 4 directions (lanes).',
    icon: <BarChart3 className="w-7 h-7 text-red-500" />,
    color: 'from-red-500 to-orange-400',
  },
  {
    title: 'Vehicle Detection (YOLO + OpenCV)',
    desc: 'Each video is processed individually to count vehicles using YOLOv5. Frames are sent to FastAPI backend for real-time inference.',
    icon: <Clock className="w-7 h-7 text-orange-500" />,
    color: 'from-orange-400 to-yellow-400',
  },
  {
    title: 'Traffic Logic Controller (Node.js)',
    desc: 'Gets vehicle counts from FastAPI, applies logic to decide which lane gets green, ensures only one lane is green at a time.',
    icon: <TrendingUp className="w-7 h-7 text-yellow-500" />,
    color: 'from-yellow-400 to-green-400',
  },
  {
    title: 'Signal Update to Arduino',
    desc: 'Sends control signals to Arduino via Wi-Fi (ESP8266). Arduino turns on respective LEDs for the selected lane.',
    icon: <Zap className="w-7 h-7 text-green-500" />,
    color: 'from-green-400 to-blue-400',
  },
  {
    title: 'Frontend Display (React)',
    desc: 'Shows current signal status, vehicle counts, and lane camera feed. Admin can also override in case of emergency.',
    icon: <BarChart3 className="w-7 h-7 text-blue-500" />,
    color: 'from-blue-400 to-purple-400',
  },
];

const Landing = ({ darkMode, toggleDarkMode }) => {
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const navigate = useNavigate();

    return (
        <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${darkMode ? 'bg-[#0B0F1A]' : 'bg-gray-50'}`}>
            {/* Enhanced Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute -inset-[10px] ${darkMode ? 'opacity-30' : 'opacity-15'}`}>
                    <div className="absolute top-0 -left-4 w-[800px] h-[800px] bg-gradient-to-r from-red-500 to-orange-500 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-[800px] h-[800px] bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-[800px] h-[800px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
                </div>
            </div>

            <Navbar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onHowItWorksClick={() => { setShowHowItWorks(true); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                onHomeClick={() => { setShowHowItWorks(false); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                onDashboardClick={() => { setShowDashboard(true); setShowHowItWorks(false); setShowMap(false); setShowTeam(false); }}
                onMapClick={() => { setShowMap(true); setShowDashboard(false); setShowHowItWorks(false); setShowTeam(false); }}
                onTeamClick={() => { setShowTeam(true); setShowDashboard(false); setShowHowItWorks(false); setShowMap(false); }}
            />

            {showDashboard ? (
                <Dashboard
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    onHowItWorksClick={() => { setShowHowItWorks(true); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                    onHomeClick={() => { setShowHowItWorks(false); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                    onDashboardClick={() => { setShowDashboard(true); setShowHowItWorks(false); setShowMap(false); setShowTeam(false); }}
                />
            ) : showHowItWorks ? (
                <HowItWorks darkMode={darkMode} />
            ) : showMap ? (
                <MapPage />
            ) : showTeam ? (
                <Team
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    onHowItWorksClick={() => { setShowHowItWorks(true); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                    onHomeClick={() => { setShowHowItWorks(false); setShowDashboard(false); setShowMap(false); setShowTeam(false); }}
                    onDashboardClick={() => { setShowDashboard(true); setShowHowItWorks(false); setShowMap(false); setShowTeam(false); }}
                    onMapClick={() => { setShowMap(true); setShowDashboard(false); setShowHowItWorks(false); setShowTeam(false); }}
                    onTeamClick={() => { setShowTeam(true); setShowDashboard(false); setShowHowItWorks(false); setShowMap(false); }}
                />
            ) : (
                <>
                    {/* Hero Section */}
                    <div className="pt-32 pb-20 px-6 relative z-10">
                        {/* Enhanced Decorative Elements */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full border-2 border-red-500/5 animate-pulse-slow"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-2 border-orange-500/10 animate-pulse-slower"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-2 border-yellow-500/15 animate-pulse"></div>

                        <div className="max-w-7xl mx-auto text-center relative">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                {/* Title with enhanced styling */}
                                <motion.h1
                                    className="text-7xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.3)] font-serif"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    Red Light
                                </motion.h1>

                                <motion.p
                                    // text-xl md:text-2xl mb-16 max-w-3xl mx-auto font-light text-gray-300 font-serif"
                                    className={`text-xl md:text-2xl mb-16 max-w-3xl ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto `}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                >
                                    Revolutionizing traffic management with AI-powered vehicle detection and intelligent flow optimization
                                </motion.p>

                                {/* Enhanced Buttons */}
                                <div className="flex flex-wrap justify-center gap-6">
                                    <motion.button
                                        className="group relative inline-flex items-center justify-center px-8 py-4 rounded-xl overflow-hidden"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500"></span>
                                        <span className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                                        <span className="relative flex items-center space-x-3 text-white font-semibold text-lg px-2">
                                            <span>Get Started</span>
                                            <BarChart3 className="w-5 h-5" />
                                        </span>
                                    </motion.button>

                                    <motion.button
                                        className="group relative inline-flex items-center justify-center px-8 py-4 rounded-xl overflow-hidden"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.7 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { navigate('/team'); }}
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></span>
                                        <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                                        <span className="relative flex items-center space-x-3 text-white font-semibold text-lg px-2">
                                            <span>Our Team</span>
                                            <Users className="w-5 h-5" />
                                        </span>
                                    </motion.button>
                                </div>

                                {/* Traffic Lights Animation */}
                                <motion.div
                                    className="flex justify-center items-center space-x-12 mt-24 mb-16"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                >
                                    <TrafficLight darkMode={darkMode} delay={0.1} />
                                    <TrafficLight darkMode={darkMode} delay={0.2} />
                                    <TrafficLight darkMode={darkMode} delay={0.3} />
                                </motion.div>

                                {/* Scroll Indicator */}
                                <motion.div
                                    className="flex flex-col items-center mt-8"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.2 }}
                                >
                                    <span className="text-gray-400 text-sm mb-2">Scroll to explore</span>
                                    <motion.div
                                        animate={{ y: [0, 8, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </motion.div>
                                </motion.div>

                                {/* How It Works Section with Circle Background */}
                                <div className="relative max-w-4xl mx-auto mt-32">
                                    {/* Circle Background for How It Works */}
                                    <div className="absolute inset-0 -z-10">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-2 border-red-500/5 animate-pulse-slow"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-2 border-orange-500/10 animate-pulse-slower"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-yellow-500/15 animate-pulse"></div>
                                    </div>

                                    <motion.h1
                                        className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent"
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.7 }}
                                    >
                                        How Does the Project Work?
                                    </motion.h1>
                                    <motion.p
                                        className="text-lg mb-12 text-center max-w-2xl mx-auto text-gray-300"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.7, delay: 0.2 }}
                                    >
                                        Our smart traffic system uses computer vision, IoT, and real-time logic to optimize traffic flow and safety. Here's a step-by-step overview:
                                    </motion.p>

                                    {/* Enhanced Steps Section */}
                                    <div className="relative pl-8">
                                        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-500 via-orange-400 to-yellow-400 rounded-full" />
                                        {steps.map((step, idx) => (
                                            <motion.div
                                                key={step.title}
                                                className="flex items-start space-x-4 p-6 mb-6 rounded-xl shadow-lg relative bg-[#171418]/80 backdrop-blur-sm text-center hover:bg-[#1a1719] transition-all duration-300"
                                                initial={{ opacity: 0, x: -50 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                                                whileHover={{ scale: 1.02, x: 10 }}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${step.color} shadow-lg absolute -left-16 top-1/2 -translate-y-1/2 transform hover:rotate-6 transition-transform duration-300`}>
                                                    {step.icon}
                                                </div>
                                                <div className="w-full text-center">
                                                    <h3 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">{step.title}</h3>
                                                    <p className="text-base text-gray-300">{step.desc}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tech Stack & Traffic Logic with Circle Background */}
                                <div className="relative mt-24">
                                    {/* Circle Background for Tech Stack & Traffic Logic */}
                                    <div className="absolute inset-0 -z-10">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-2 border-red-500/5 animate-pulse-slow"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-2 border-orange-500/10 animate-pulse-slower"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-yellow-500/15 animate-pulse"></div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                        {/* Tech Stack */}
                                        <motion.div
                                            className="group bg-[#171418]/80 backdrop-blur-sm border border-red-900/20 rounded-xl p-8 shadow-xl text-center hover:bg-[#1a1719] transition-all duration-300"
                                            initial={{ opacity: 0, y: 40 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <h3 className="text-2xl font-bold mb-8 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">🏗️ Tech Stack</h3>
                                            <div className="space-y-4">
                                                {[
                                                    { label: "Frontend", value: "React.js", color: "text-blue-400" },
                                                    { label: "Backend (AI)", value: "FastAPI + YOLOv5 + OpenCV", color: "text-green-400" },
                                                    { label: "Logic Controller", value: "Node.js + Express", color: "text-yellow-400" },
                                                    { label: "Hardware", value: "Arduino UNO + ESP8266 Wi-Fi", color: "text-red-400" },
                                                    { label: "Communication", value: "HTTP/WebSocket", color: "text-orange-400" }
                                                ].map((item, idx) => (
                                                    <motion.div
                                                        key={item.label}
                                                        className="flex justify-between items-center p-4 rounded-lg bg-[#1a1719]/50 hover:bg-[#1a1719] transition-all duration-300"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        viewport={{ once: true }}
                                                        transition={{ delay: 0.3 + idx * 0.1 }}
                                                    >
                                                        <span className="font-medium text-gray-300">{item.label}:</span>
                                                        <span className={`${item.color} font-semibold`}>{item.value}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>

                                        {/* Traffic Logic Rules */}
                                        <motion.div
                                            className="group bg-[#171418]/80 backdrop-blur-sm border border-red-900/20 rounded-xl p-8 shadow-xl text-center hover:bg-[#1a1719] transition-all duration-300"
                                            initial={{ opacity: 0, y: 40 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.6, delay: 0.3 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <h3 className="text-2xl font-bold mb-8 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">🔁 Traffic Logic Rules</h3>
                                            <div className="space-y-6">
                                                <motion.div
                                                    className="p-6 rounded-lg bg-[#1a1719]/50 hover:bg-[#1a1719] transition-all duration-300"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: 0.4 }}
                                                >
                                                    <h4 className="font-semibold mb-3 text-xl text-red-400">Core Rule:</h4>
                                                    <p className="text-gray-300">Only <strong>1 lane</strong> can have a green signal at any given time</p>
                                                </motion.div>
                                                <motion.div
                                                    className="p-6 rounded-lg bg-[#1a1719]/50 hover:bg-[#1a1719] transition-all duration-300"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: 0.5 }}
                                                >
                                                    <h4 className="font-semibold mb-3 text-xl text-orange-400">Priority Logic:</h4>
                                                    <div className="bg-[#231E24] p-4 rounded-lg font-mono text-sm text-green-400 shadow-inner">{`if (laneA > laneB && laneA > laneC && laneA > laneD) {\n    green = A\n}`}</div>
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Landing;