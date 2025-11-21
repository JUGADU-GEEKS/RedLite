import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getToken } from '../services/auth';
import Navbar from '../components/Navbar';
import { Plus, UserPlus, Radio, MapPin, Activity } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const IntersectionsAdmin = () => {
    const [intersections, setIntersections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // ... state for forms ...
    const [newIntersection, setNewIntersection] = useState({
        intersectionId: '',
        name: '',
        coordinates: { lat: 0, lon: 0 },
        lanes: { north: '', south: '', east: '', west: '' }
    });
    const [assignEmployee, setAssignEmployee] = useState({ intersectionId: '', employeeId: '' });
    const [registerDevice, setRegisterDevice] = useState({ intersectionId: '', iotDeviceId: '' });

    // ... fetch functions ...
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
                // Clear forms if needed
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-24 px-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Intersection Management</h1>
                    <p className="text-gray-600 mt-2">Manage traffic intersections, assignments, and IoT devices</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Forms */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Create Intersection Form */}
                        <motion.div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-center gap-2 mb-4 text-amber-600">
                                <MapPin size={20} />
                                <h2 className="text-lg font-semibold">Create Intersection</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/create`, newIntersection, 'Intersection created!')} className="space-y-4">
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Intersection ID (e.g. I001)"
                                    value={newIntersection.intersectionId}
                                    onChange={e => setNewIntersection({...newIntersection, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Name (e.g. Main St & 1st Ave)"
                                    value={newIntersection.name}
                                    onChange={e => setNewIntersection({...newIntersection, name: e.target.value})}
                                    required
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        type="number" step="any"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Latitude"
                                        onChange={e => setNewIntersection({...newIntersection, coordinates: {...newIntersection.coordinates, lat: parseFloat(e.target.value)}})}
                                    />
                                    <input 
                                        type="number" step="any"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Longitude"
                                        onChange={e => setNewIntersection({...newIntersection, coordinates: {...newIntersection.coordinates, lon: parseFloat(e.target.value)}})}
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
                                    Create Intersection
                                </button>
                            </form>
                        </motion.div>

                        {/* Assign Employee Form */}
                        <motion.div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div className="flex items-center gap-2 mb-4 text-blue-600">
                                <UserPlus size={20} />
                                <h2 className="text-lg font-semibold">Assign Employee</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/${assignEmployee.intersectionId}/assign_employee`, { employee_id: assignEmployee.employeeId }, 'Employee assigned!')} className="space-y-4">
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Intersection ID"
                                    value={assignEmployee.intersectionId}
                                    onChange={e => setAssignEmployee({...assignEmployee, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Employee ID"
                                    value={assignEmployee.employeeId}
                                    onChange={e => setAssignEmployee({...assignEmployee, employeeId: e.target.value})}
                                    required
                                />
                                <button type="submit" disabled={loading} className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                                    Assign Employee
                                </button>
                            </form>
                        </motion.div>

                        {/* Register Device Form */}
                        <motion.div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <div className="flex items-center gap-2 mb-4 text-purple-600">
                                <Radio size={20} />
                                <h2 className="text-lg font-semibold">Register IoT Device</h2>
                            </div>
                            <form onSubmit={(e) => handleSubmit(e, `${API_URL}/intersections/${registerDevice.intersectionId}/register_device`, { iot_device_id: registerDevice.iotDeviceId }, 'Device registered!')} className="space-y-4">
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Intersection ID"
                                    value={registerDevice.intersectionId}
                                    onChange={e => setRegisterDevice({...registerDevice, intersectionId: e.target.value})}
                                    required
                                />
                                <input 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="IoT Device ID"
                                    value={registerDevice.iotDeviceId}
                                    onChange={e => setRegisterDevice({...registerDevice, iotDeviceId: e.target.value})}
                                    required
                                />
                                <button type="submit" disabled={loading} className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors">
                                    Register Device
                                </button>
                            </form>
                        </motion.div>
                    </div>

                    {/* Right Column: List */}
                    <div className="lg:col-span-2">
                        <motion.div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 text-gray-800">
                                    <Activity size={20} />
                                    <h2 className="text-lg font-semibold">Active Intersections</h2>
                                </div>
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                                    Total: {intersections.length}
                                </span>
                            </div>

                            {msg.text && (
                                <div className={`mb-6 p-4 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {msg.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                {intersections.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No intersections found.</p>
                                ) : (
                                    intersections.map(intersection => (
                                        <div key={intersection.intersectionId} className="p-4 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{intersection.name}</h3>
                                                    <p className="text-sm text-gray-500 font-mono mt-1">ID: {intersection.intersectionId}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${intersection.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {intersection.status}
                                                </span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 mb-1">IoT Device</p>
                                                    <p className="font-medium text-gray-800">{intersection.iotDeviceId || 'Not Registered'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Assigned Employees</p>
                                                    <p className="font-medium text-gray-800">
                                                        {intersection.assignedEmployees.length > 0 
                                                            ? intersection.assignedEmployees.join(', ') 
                                                            : 'None'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntersectionsAdmin;
