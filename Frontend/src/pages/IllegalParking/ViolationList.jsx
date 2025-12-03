import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Plus, Camera, Video, MapPin, Gauge, Timer, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchViolations, approveViolation, rejectViolation, reportViolation } from '../../services/illegalParkingService';

const ViolationList = ({ cameraId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [error, setError] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    loadViolations();
    const interval = setInterval(loadViolations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [cameraId, statusFilter]);

  const loadViolations = async () => {
    try {
      setLoading(true);
      const data = await fetchViolations(cameraId, statusFilter, 100);
      setViolations(data);
    } catch (err) {
      setError('Failed to load violations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (violationId) => {
    try {
      await approveViolation(violationId);
      await loadViolations();
    } catch (err) {
      setError('Failed to approve violation: ' + err.message);
    }
  };

  const handleReject = async (violationId) => {
    try {
      await rejectViolation(violationId);
      await loadViolations();
    } catch (err) {
      setError('Failed to reject violation: ' + err.message);
    }
  };

  const handleCreateTestViolation = async () => {
    try {
      setLoading(true);
      setError('');
      // Generate random test data
      const testPlates = ['ABC1234', 'XYZ5678', 'DEF9012', 'GHI3456', 'JKL7890'];
      const testZones = ['ZONE-001', 'ZONE-002', null];
      const testLines = ['LINE-001', 'LINE-002', null];
      
      await reportViolation({
        cameraId: cameraId,
        zoneId: testZones[Math.floor(Math.random() * testZones.length)],
        lineId: testLines[Math.floor(Math.random() * testLines.length)],
        plateNumber: testPlates[Math.floor(Math.random() * testPlates.length)],
        severityScore: Math.random() * 50 + 50, // 50-100
        dwellTime: Math.random() * 120 + 30, // 30-150 seconds
        vehicleImageUrl: null, // Can be set to a test image URL if available
        videoClipUrl: null, // Can be set to a test video URL if available
        status: 'pending'
      });
      await loadViolations();
    } catch (err) {
      setError('Failed to create test violation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'auto-escalated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle both ISO string and timestamp formats
      let date;
      if (typeof dateString === 'string') {
        // If it's an ISO string, parse it directly
        date = new Date(dateString);
      } else if (typeof dateString === 'object' && dateString.$date) {
        // MongoDB date format
        date = new Date(dateString.$date);
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Convert UTC to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const istDate = new Date(date.getTime() + istOffset);
      
      // Format as IST time
      return istDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">Violations</h2>
        <div className="flex gap-3">
          <button
            onClick={handleCreateTestViolation}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Test Violation
          </button>
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="auto-escalated">Auto-Escalated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && violations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading violations...</div>
      ) : violations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No violations found</p>
          <p className="text-sm text-gray-400 mb-4">
            Click "Create Test Violation" above to add a sample violation for testing.
          </p>
          <p className="text-xs text-gray-400">
            In production, violations are automatically detected when vehicles park illegally in zones or cross boundary lines.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {violations.map((violation) => (
            <motion.div
              key={violation._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedViolation(violation)}
            >
              <div className="flex gap-4">
                {/* Vehicle Image - Larger and More Prominent */}
                <div className="flex-shrink-0">
                  {violation.vehicleImageUrl ? (
                    <img
                      src={violation.vehicleImageUrl.startsWith('http') ? violation.vehicleImageUrl : `${import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000'}${violation.vehicleImageUrl}`}
                      alt="Vehicle"
                      className="w-40 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-md"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="128" viewBox="0 0 160 128"%3E%3Crect fill="%23f0f0f0" width="160" height="128"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-40 h-32 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(violation.status)}`}>
                        {violation.status.toUpperCase()}
                      </span>
                      {violation.plateNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">License Plate:</span>
                          <span className="font-mono text-xl font-bold text-gray-900 bg-yellow-50 px-3 py-1 rounded border-2 border-yellow-300">
                            {violation.plateNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No plate detected</span>
                      )}
                    </div>
                  </div>

                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Time:</span>
                      <span>{formatDate(violation.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Gauge className="w-4 h-4 text-orange-400" />
                      <span className="font-medium">Severity:</span>
                      <span className="font-bold text-orange-600">{violation.severityScore?.toFixed(1) || 0}/100</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Timer className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">Dwell Time:</span>
                      <span className="font-bold">{Math.floor(violation.dwellTime || 0)}s</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span className="font-medium">Camera:</span>
                      <span className="font-mono">{violation.cameraId}</span>
                    </div>
                    {violation.zoneId && (
                      <div className="flex items-center gap-2 text-gray-600 col-span-2">
                        <span className="font-medium">Zone Violation:</span>
                        <span className="font-mono bg-red-50 px-2 py-1 rounded text-red-700">{violation.zoneId}</span>
                      </div>
                    )}
                    {violation.lineId && (
                      <div className="flex items-center gap-2 text-gray-600 col-span-2">
                        <span className="font-medium">Boundary Violation:</span>
                        <span className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">{violation.lineId}</span>
                      </div>
                    )}
                    {violation.videoClipUrl && (
                      <div className="flex items-center gap-2 text-gray-600 col-span-2">
                        <Video className="w-4 h-4 text-purple-400" />
                        <a 
                          href={violation.videoClipUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Video Clip
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {violation.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(violation._id);
                        }}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(violation._id);
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detailed View Modal */}
      <AnimatePresence>
        {selectedViolation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedViolation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">Violation Details</h3>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Image */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Vehicle Image</h4>
                  {selectedViolation.vehicleImageUrl ? (
                    <img
                      src={selectedViolation.vehicleImageUrl.startsWith('http') ? selectedViolation.vehicleImageUrl : `${import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000'}${selectedViolation.vehicleImageUrl}`}
                      alt="Vehicle"
                      className="w-full rounded-lg border-2 border-gray-300 shadow-lg"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="18"%3ENo Image Available%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-400" />
                      <span className="ml-2 text-gray-500">No image available</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Violation Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">License Plate:</span>
                        <span className="font-mono text-xl font-bold text-gray-900">
                          {selectedViolation.plateNumber || 'Not detected'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedViolation.status)}`}>
                          {selectedViolation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Severity Score:</span>
                        <span className="font-bold text-orange-600">{selectedViolation.severityScore?.toFixed(1) || 0}/100</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Dwell Time:</span>
                        <span className="font-bold">{Math.floor(selectedViolation.dwellTime || 0)} seconds</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Camera ID:</span>
                        <span className="font-mono">{selectedViolation.cameraId}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Timestamp:</span>
                        <span className="text-sm">{formatDate(selectedViolation.timestamp)}</span>
                      </div>
                      {selectedViolation.zoneId && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-gray-600 block mb-1">Zone Violation:</span>
                          <span className="font-mono text-red-700 font-semibold">{selectedViolation.zoneId}</span>
                        </div>
                      )}
                      {selectedViolation.lineId && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-gray-600 block mb-1">Boundary Line Violation:</span>
                          <span className="font-mono text-blue-700 font-semibold">{selectedViolation.lineId}</span>
                        </div>
                      )}
                      {selectedViolation.videoClipUrl && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <a
                            href={selectedViolation.videoClipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-700 hover:text-purple-900 flex items-center gap-2 font-medium"
                          >
                            <Video className="w-5 h-5" />
                            View Video Clip
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedViolation.status === 'pending' && (
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => {
                          handleApprove(selectedViolation._id);
                          setSelectedViolation(null);
                        }}
                        className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve Violation
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedViolation._id);
                          setSelectedViolation(null);
                        }}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject Violation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViolationList;

