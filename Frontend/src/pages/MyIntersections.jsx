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
                // Added trailing slash to match backend endpoint definition
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
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-24 px-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
                    <p className="text-gray-600 mt-2">View and manage your assigned traffic intersections</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                ) : intersections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {intersections.map((intersection, index) => (
                            <motion.div 
                                key={intersection.intersectionId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                            <MapPin size={24} />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            intersection.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {intersection.status}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{intersection.name}</h3>
                                    <p className="text-sm text-gray-500 font-mono mb-4">ID: {intersection.intersectionId}</p>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">IoT Device</span>
                                            <span className="font-medium text-gray-900">{intersection.iotDeviceId || 'Not Connected'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Coordinates</span>
                                            <span className="font-medium text-gray-900">
                                                {intersection.coordinates?.lat?.toFixed(4)}, {intersection.coordinates?.lon?.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>

                                    <Link 
                                        to={`/dashboard/${intersection.intersectionId}`}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <Activity size={18} />
                                        View Dashboard
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                            <MapPin size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments Found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            You haven't been assigned to any intersections yet. Please contact your administrator to get assigned.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyIntersections;
