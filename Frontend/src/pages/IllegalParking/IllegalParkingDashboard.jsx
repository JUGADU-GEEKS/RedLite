import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, MapPin, AlertTriangle, Settings, List, Play, Square, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import VideoPlayer from './VideoPlayer';
import ZoneEditor from './ZoneEditor';
import BoundaryLineEditor from './BoundaryLineEditor';
import ViolationList from './ViolationList';
import { startDetection, stopDetection, getDetectionStatus } from '../../services/illegalParkingService';

const IllegalParkingDashboard = () => {
  const [activeTab, setActiveTab] = useState('video');
  const [selectedCamera, setSelectedCamera] = useState('CAM-001');
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const cameras = [
    { id: 'CAM-001', name: 'Main Street Camera', streamUrl: '/Videos/1.mp4', videoFile: '1.mp4' },
    { id: 'CAM-002', name: 'Park Avenue Camera', streamUrl: '/Videos/2.mp4', videoFile: '2.mp4' },
    { id: 'CAM-003', name: 'Highway Camera', streamUrl: '/Videos/3.mp4', videoFile: '3.mp4' },
    { id: 'CAM-004', name: 'City Center Camera', streamUrl: '/Videos/5.mp4', videoFile: '5.mp4' }
  ];

  // Get video path for selected camera (relative to Backend directory)
  const getVideoPath = (cameraId) => {
    const camera = cameras.find(cam => cam.id === cameraId);
    if (camera) {
      // Return path relative to Backend directory
      return `Videos/${camera.videoFile}`;
    }
    return `Videos/${cameraId === 'CAM-004' ? '5' : cameraId.slice(-1)}.mp4`;
  };

  // Check detection status on mount and when camera changes
  useEffect(() => {
    checkDetectionStatus();
    const interval = setInterval(checkDetectionStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [selectedCamera]);

  const checkDetectionStatus = async () => {
    try {
      const status = await getDetectionStatus();
      setDetectionStatus(status);
      setDetectionRunning(status.status === 'running' && status.cameras_monitored.includes(selectedCamera));
    } catch (err) {
      console.error('Failed to check detection status:', err);
    }
  };

  const handleStartDetection = async () => {
    try {
      setLoading(true);
      setError('');
      const videoPath = getVideoPath(selectedCamera);
      await startDetection(selectedCamera, videoPath, 2.0);
      setDetectionRunning(true);
      await checkDetectionStatus();
    } catch (err) {
      setError('Failed to start detection: ' + err.message);
      setDetectionRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStopDetection = async () => {
    try {
      setLoading(true);
      setError('');
      await stopDetection();
      setDetectionRunning(false);
      await checkDetectionStatus();
    } catch (err) {
      setError('Failed to stop detection: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10" style={{ paddingTop: '5.5rem' }}>
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent">
              Illegal Parking Detection
            </h1>
            <p className="text-lg text-gray-600">
              Monitor and manage illegal parking violations in real-time
            </p>
          </motion.div>

          {/* Camera Selector and Detection Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Camera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Detection Control */}
              <div className="flex gap-3 items-end">
                {detectionRunning ? (
                  <motion.button
                    onClick={handleStopDetection}
                    disabled={loading}
                    className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Square className="w-4 h-4" />
                    Stop Detection
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleStartDetection}
                    disabled={loading}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-4 h-4" />
                    Start Detection
                  </motion.button>
                )}
                
                {detectionRunning && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">Monitoring</span>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {detectionStatus && (
              <div className="mt-2 text-xs text-gray-500">
                Status: {detectionStatus.status} | 
                Model: {detectionStatus.model_loaded ? 'Loaded' : 'Not Loaded'} |
                Cameras: {detectionStatus.cameras_monitored.length > 0 ? detectionStatus.cameras_monitored.join(', ') : 'None'}
              </div>
            )}
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-4 mb-6">
            <motion.button
              onClick={() => setActiveTab('video')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Video className="inline-block w-5 h-5 mr-2" />
              Video Feed
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('zones')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'zones'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MapPin className="inline-block w-5 h-5 mr-2" />
              Edit Zones
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('boundaries')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'boundaries'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="inline-block w-5 h-5 mr-2" />
              Edit Boundaries
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('violations')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'violations'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List className="inline-block w-5 h-5 mr-2" />
              Violations
            </motion.button>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
          >
            {activeTab === 'video' && (
              <VideoPlayer cameraId={selectedCamera} />
            )}
            {activeTab === 'zones' && (
              <ZoneEditor cameraId={selectedCamera} />
            )}
            {activeTab === 'boundaries' && (
              <BoundaryLineEditor cameraId={selectedCamera} />
            )}
            {activeTab === 'violations' && (
              <ViolationList cameraId={selectedCamera} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default IllegalParkingDashboard;

