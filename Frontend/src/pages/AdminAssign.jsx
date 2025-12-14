import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getAuthHeaders } from '../services/auth';
import Navbar from '../components/Navbar';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function AdminAssign() {
  const [intersectionId, setIntersectionId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const assign = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/admin/assign_employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ intersectionId, employeeId })
        });
        setMsg(res.ok ? 'Assigned successfully' : 'Failed to assign');
    } catch (err) {
        setMsg('Error connecting to server');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="pt-24 px-6 max-w-xl mx-auto">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
        >
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Assign Employee</h2>
            
            <form onSubmit={assign} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intersection ID</label>
                    <input 
                        value={intersectionId} 
                        onChange={(e)=>setIntersectionId(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="e.g. I001"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input 
                        value={employeeId} 
                        onChange={(e)=>setEmployeeId(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="e.g. USER-123456"
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                        loading ? 'bg-gray-400' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:scale-[1.02]'
                    }`}
                >
                    {loading ? 'Assigning...' : 'Assign Employee'}
                </button>
            </form>
            
            {msg && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`mt-6 p-4 rounded-lg text-center ${
                        msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                >
                    {msg}
                </motion.div>
            )}
        </motion.div>
      </div>
    </div>
  );
}
