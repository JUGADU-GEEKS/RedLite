import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getToken } from '../services/auth';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { MapPin, Activity, ArrowRight, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const MyIntersections = () => {
    const [intersections, setIntersections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAssignedIntersections = async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/intersections/assigned/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setIntersections(data);
                    } else {
                        console.error("Expected array but got:", data);
                        setError('Invalid data received from server');
                    }
                } else {
                    const err = await response.json();
                    setError(err.detail || 'Failed to fetch intersections');
                }
            } catch (err) {
                console.error("Error fetching intersections:", err);
                setError('Network error. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchAssignedIntersections();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
            {/* Soft gradient orbs */}
            <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
            <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

            <Navbar />
            <div className="pt-28 px-6 max-w-7xl mx-auto pb-12 relative z-10">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
                        My Assignments
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
                    <p className="text-lg text-gray-700">
                        View and manage your assigned traffic intersections
                    </p>
                </motion.div>

                {loading ? (
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="flex justify-center py-24"
                    >
                        <div className="inline-flex p-6 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-full border-2 border-transparent bg-clip-padding">
                            <div className="w-12 h-12 border-4 border-gray-300 border-t-amber-600 rounded-full animate-spin"></div>
                        </div>
                    </motion.div>
                ) : error ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/60 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-lg"
                    >
                        <AlertCircle size={24} />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                ) : intersections.length > 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, staggerChildren: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {intersections.map((intersection, index) => (
                            <motion.div 
                                key={intersection.intersectionId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -8 }}
                                className="group"
                            >
                                <div className="relative h-full bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl hover:border-amber-200/50 transition-all duration-300">
                                    {/* Gradient overlay on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-600/0 group-hover:from-amber-500/5 group-hover:to-orange-600/5 transition-all duration-300"></div>
                                    
                                    <div className="relative p-8">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <motion.div 
                                                whileHover={{ scale: 1.1, rotate: 10 }}
                                                className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl text-amber-600 shadow-md"
                                            >
                                                <MapPin size={32} strokeWidth={1.5} />
                                            </motion.div>
                                            <motion.span 
                                                whileHover={{ scale: 1.05 }}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                                                    intersection.status === 'active' 
                                                        ? 'bg-gradient-to-r from-emerald-100 to-green-50 text-emerald-700 shadow-md' 
                                                        : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600'
                                                }`}
                                            >
                                                {intersection.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                                            </motion.span>
                                        </div>
                                        
                                        {/* Title */}
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                            {intersection.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 font-mono mb-6 bg-white/80 px-3 py-2 rounded-lg border border-amber-100/50">
                                            ID: {intersection.intersectionId}
                                        </p>
                                        
                                        {/* Info Grid */}
                                        <div className="space-y-3 mb-8">
                                            <motion.div 
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between text-sm p-4 bg-white/80 backdrop-blur rounded-xl border border-amber-100/50 hover:border-amber-300/50 transition-all shadow-sm"
                                            >
                                                <span className="text-gray-700 font-semibold">📱 IoT Device</span>
                                                <span className="font-bold text-gray-900">
                                                    {intersection.iotDeviceId || 'Not Connected'}
                                                </span>
                                            </motion.div>
                                            <motion.div 
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between text-sm p-4 bg-white/80 backdrop-blur rounded-xl border border-amber-100/50 hover:border-amber-300/50 transition-all shadow-sm"
                                            >
                                                <span className="text-gray-700 font-semibold">📍 Coordinates</span>
                                                <span className="font-mono font-bold text-gray-900 text-xs">
                                                    {intersection.coordinates && intersection.coordinates.lat && intersection.coordinates.lon 
                                                        ? `${intersection.coordinates.lat.toFixed(4)}, ${intersection.coordinates.lon.toFixed(4)}`
                                                        : 'N/A'}
                                                </span>
                                            </motion.div>
                                        </div>

                                        {/* Button */}
                                        <Link 
                                            to={`/dashboard/${intersection.intersectionId}`}
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl group/btn"
                                        >
                                            <Activity size={20} />
                                            <span>View Dashboard</span>
                                            <motion.span
                                                className="group-hover/btn:translate-x-1 transition-transform"
                                            >
                                                <ArrowRight size={18} />
                                            </motion.span>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-24 bg-white/60 backdrop-blur-sm rounded-3xl border-2 border-dashed border-amber-300 shadow-xl"
                    >
                        <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="inline-flex p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full text-amber-600 mb-4 shadow-md"
                        >
                            <MapPin size={48} />
                        </motion.div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-3 font-serif">No Assignments Found</h3>
                        <p className="text-gray-700 max-w-md mx-auto leading-relaxed text-lg">
                            You haven't been assigned to any intersections yet. Please contact your administrator to get assigned.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default MyIntersections;
