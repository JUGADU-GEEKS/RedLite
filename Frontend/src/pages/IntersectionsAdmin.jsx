import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getToken } from '../services/auth';
import Navbar from '../components/Navbar';
import { MapPin, UserPlus, Radio, Activity, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const IntersectionsAdmin = () => {
    const [intersections, setIntersections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const [newIntersection, setNewIntersection] = useState({
        intersectionId: '',
        name: '',
        coordinates: { lat: 0, lon: 0 },
        lanes: { north: '', south: '', east: '', west: '' }
    });
    const [assignEmployee, setAssignEmployee] = useState({ intersectionId: '', employeeId: '' });
    const [registerDevice, setRegisterDevice] = useState({ intersectionId: '', iotDeviceId: '' });

    const fetchIntersections = async () => {
        const token = getToken();
        try {
            const response = await fetch(`${API_URL}/intersections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIntersections(data);
            }
        } catch (error) {
            console.error("Failed to fetch intersections", error);
        }
    };

    useEffect(() => {
        fetchIntersections();
    }, []);

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            // Use a temporary loading state just for this action if needed, 
            // but reusing 'loading' is fine if we want to block other actions.
            // Or better, just show a toast.
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setNewIntersection(prev => ({
                        ...prev,
                        coordinates: {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        }
                    }));
                    setMsg({ type: 'success', text: '📍 Location fetched successfully!' });
                    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setMsg({ type: 'error', text: '❌ Failed to get location. Please allow access.' });
                }
            );
        } else {
            setMsg({ type: 'error', text: '❌ Geolocation is not supported by this browser.' });
        }
    };

    const handleSubmit = async (e, url, body, successMsg) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });
        const token = getToken();
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setMsg({ type: 'success', text: successMsg });
                fetchIntersections();
                setNewIntersection({ intersectionId: '', name: '', coordinates: { lat: 0, lon: 0 }, lanes: { north: '', south: '', east: '', west: '' } });
                setAssignEmployee({ intersectionId: '', employeeId: '' });
                setRegisterDevice({ intersectionId: '', iotDeviceId: '' });
                setTimeout(() => setMsg({ type: '', text: '' }), 3000);
            } else {
                const err = await res.json();
                setMsg({ type: 'error', text: err.detail || 'Operation failed' });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const formInputClass = "w-full px-4 py-3 rounded-xl border border-amber-200/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all backdrop-blur-sm bg-white/80 hover:bg-white text-gray-900 placeholder-gray-500";
    const formButtonClass = "w-full py-3 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl text-white uppercase tracking-wide";

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
                        Intersection Management
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
                    <p className="text-lg text-gray-700">
                        🛣️ Manage traffic intersections, assignments, and IoT devices
                    </p>
                </motion.div>

                {/* Alert Message */}
                {msg.text && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mb-6 p-5 rounded-2xl flex items-center gap-3 backdrop-blur-sm shadow-lg border ${
                            msg.type === 'success' 
                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 border-emerald-300 text-emerald-800' 
                                : 'bg-gradient-to-r from-red-100 to-red-50 border-red-300 text-red-800'
                        }`}
                    >
                        {msg.type === 'success' ? (
                            <CheckCircle size={24} className="flex-shrink-0" />
                        ) : (
                            <AlertCircle size={24} className="flex-shrink-0" />
                        )}
                        <span className="font-semibold">{msg.text}</span>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Forms */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Create Intersection Form */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-amber-200/50">
                                <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl text-amber-600 shadow-md">
                                    <MapPin size={28} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Create Intersection</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/create`, newIntersection, '✨ Intersection created successfully!')} className="space-y-4">
                                <input 
                                    className={formInputClass}
                                    placeholder="Intersection ID (e.g. I001)"
                                    value={newIntersection.intersectionId}
                                    onChange={e => setNewIntersection({...newIntersection, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className={formInputClass}
                                    placeholder="Name (e.g. Main St & 1st Ave)"
                                    value={newIntersection.name}
                                    onChange={e => setNewIntersection({...newIntersection, name: e.target.value})}
                                    required
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        type="number" step="any"
                                        className={formInputClass}
                                        placeholder="Latitude"
                                        value={newIntersection.coordinates.lat || ''}
                                        onChange={e => setNewIntersection({...newIntersection, coordinates: {...newIntersection.coordinates, lat: parseFloat(e.target.value)}})}
                                    />
                                    <input 
                                        type="number" step="any"
                                        className={formInputClass}
                                        placeholder="Longitude"
                                        value={newIntersection.coordinates.lon || ''}
                                        onChange={e => setNewIntersection({...newIntersection, coordinates: {...newIntersection.coordinates, lon: parseFloat(e.target.value)}})}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleGetLocation}
                                    className="w-full py-2 bg-amber-100 text-amber-700 rounded-xl font-semibold hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <MapPin size={18} />
                                    Get Current Location
                                </button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit" 
                                    disabled={loading} 
                                    className={`${formButtonClass} bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 disabled:opacity-50`}
                                >
                                    {loading ? 'Creating...' : 'Create Intersection'}
                                </motion.button>
                            </form>
                        </motion.div>

                        {/* Assign Employee Form */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-amber-200/50">
                                <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl text-amber-600 shadow-md">
                                    <UserPlus size={28} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Assign Employee</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/${assignEmployee.intersectionId}/assign_employee`, { employee_id: assignEmployee.employeeId }, '👤 Employee assigned successfully!')} className="space-y-4">
                                <input 
                                    className={formInputClass}
                                    placeholder="Intersection ID"
                                    value={assignEmployee.intersectionId}
                                    onChange={e => setAssignEmployee({...assignEmployee, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className={formInputClass}
                                    placeholder="Employee ID"
                                    value={assignEmployee.employeeId}
                                    onChange={e => setAssignEmployee({...assignEmployee, employeeId: e.target.value})}
                                    required
                                />
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit" 
                                    disabled={loading}
                                    className={`${formButtonClass} bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 disabled:opacity-50`}
                                >
                                    {loading ? 'Assigning...' : 'Assign Employee'}
                                </motion.button>
                            </form>
                        </motion.div>

                        {/* Register Device Form */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200/50">
                                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl text-purple-600 shadow-md">
                                    <Radio size={28} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Register IoT Device</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/${registerDevice.intersectionId}/register_device`, { iot_device_id: registerDevice.iotDeviceId }, '📱 Device registered successfully!')} className="space-y-4">
                                <input 
                                    className={formInputClass}
                                    placeholder="Intersection ID"
                                    value={registerDevice.intersectionId}
                                    onChange={e => setRegisterDevice({...registerDevice, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className={formInputClass}
                                    placeholder="IoT Device ID"
                                    value={registerDevice.iotDeviceId}
                                    onChange={e => setRegisterDevice({...registerDevice, iotDeviceId: e.target.value})}
                                    required
                                />
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit" 
                                    disabled={loading}
                                    className={`${formButtonClass} bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50`}
                                >
                                    {loading ? 'Registering...' : 'Register Device'}
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>

                    {/* Right Column: List */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all"
                    >
                        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-amber-200/50">
                            <div className="flex items-center gap-3 text-gray-900">
                                <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl text-amber-600 shadow-md">
                                    <Activity size={28} />
                                </div>
                                <h2 className="text-2xl font-bold">Active Intersections</h2>
                            </div>
                            <motion.span 
                                whileHover={{ scale: 1.05 }}
                                className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold shadow-md"
                            >
                                Total: {intersections.length}
                            </motion.span>
                        </div>

                        <div className="space-y-4 max-h-[1000px] overflow-y-auto">
                            {intersections.length === 0 ? (
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="text-center py-16 text-gray-600"
                                >
                                    <p className="text-lg font-medium">No intersections found.</p>
                                </motion.div>
                            ) : (
                                intersections.map((intersection, idx) => (
                                    <motion.div 
                                        key={intersection.intersectionId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileHover={{ x: 8 }}
                                        className="p-6 rounded-2xl border border-white/60 hover:border-amber-300/60 bg-white/80 hover:bg-gradient-to-r hover:from-amber-50/80 to-orange-50/80 transition-all duration-300 group cursor-pointer shadow-md hover:shadow-lg"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl text-gray-900 group-hover:text-amber-700 transition-colors">
                                                    {intersection.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 font-mono mt-1">
                                                    ID: {intersection.intersectionId}
                                                </p>
                                            </div>
                                            <motion.span 
                                                whileHover={{ scale: 1.1 }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                                                    intersection.status === 'active' 
                                                        ? 'bg-emerald-100 text-emerald-700 shadow-md' 
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {intersection.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                                            </motion.span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <motion.div 
                                                whileHover={{ scale: 1.05 }}
                                                className="bg-white/80 backdrop-blur rounded-xl p-3 border border-amber-100/50 shadow-sm"
                                            >
                                                <p className="text-gray-700 font-semibold text-xs">📱 IoT Device</p>
                                                <p className="font-bold text-gray-900 mt-1">
                                                    {intersection.iotDeviceId || 'Not Registered'}
                                                </p>
                                            </motion.div>
                                            <motion.div 
                                                whileHover={{ scale: 1.05 }}
                                                className="bg-white/80 backdrop-blur rounded-xl p-3 border border-amber-100/50 shadow-sm"
                                            >
                                                <p className="text-gray-700 font-semibold text-xs">👥 Assigned Employees</p>
                                                <p className="font-bold text-gray-900 mt-1">
                                                    {intersection.assignedEmployees.length > 0 
                                                        ? intersection.assignedEmployees.join(', ') 
                                                        : 'None'}
                                                </p>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default IntersectionsAdmin;
