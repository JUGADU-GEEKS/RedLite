import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, Video, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

// Floating elements for background decoration (same as landing page)
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{
      y: [-10, 10, -10],
      rotate: [-2, 2, -2],
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

function Issue() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setUploadedFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    } else {
      alert('Please upload only image or video files.');
    }
  };

  // Get browser geolocation once on mount (optional, used to send lat/lon with upload)
  React.useEffect(() => {
    if (navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setCoords({ lat: null, lon: null });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const analyzeIssue = async () => {
    setError(null);
    setAnalyzeResult(null);
    if (!uploadedFile) {
      setError('Please upload a file first');
      return;
    }

    try {
      setLoadingAnalyze(true);
      const form = new FormData();
      form.append('file', uploadedFile, uploadedFile.name);
      if (coords.lat != null) form.append('lat', String(coords.lat));
      if (coords.lon != null) form.append('lon', String(coords.lon));

      // Change host/port if your backend runs elsewhere
        const res = await fetch(`${import.meta.env.VITE_API_URL}/analyze_issue`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Server error');
      }

      const data = await res.json();
      setAnalyzeResult(data);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Analysis failed');
    } finally {
      setLoadingAnalyze(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements (same as landing page) */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-20 right-1/4">
          <FloatingElement delay={0}>
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400/30 to-orange-400/30 rounded-lg rotate-45"></div>
          </FloatingElement>
        </div>
        <div className="absolute bottom-1/3 left-10">
          <FloatingElement delay={1} duration={4}>
            <div className="w-4 h-4 bg-gradient-to-br from-yellow-400/30 to-amber-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
        <div className="absolute top-1/3 left-1/3">
          <FloatingElement delay={2} duration={5}>
            <div className="w-8 h-2 bg-gradient-to-r from-orange-400/30 to-red-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-20 pb-20 px-6">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="fixed top-24 left-8 z-20 flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>

        <Navbar />
        <div className="max-w-4xl mx-auto" style={{ paddingTop: '5.5rem' }}>
          {/* Header Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
              Report an Issue
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-8"></div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Upload an image or video of traffic-related issues like potholes or damaged roads. 
              Our AI will analyze and verify the issue automatically.
            </p>
          </motion.div>

          {/* Upload Section */}
          <motion.div
            className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
              Select Image or Video of the Issue
            </h2>

            {/* File Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-gray-300 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                accept="image/*,video/*"
                id="file-upload"
              />

              {uploadedFile ? (
                <div className="space-y-6">
                  {/* File Preview */}
                  <div className="flex justify-center">
                    {uploadedFile.type.startsWith('image/') ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-w-xs max-h-48 rounded-lg shadow-lg object-cover"
                      />
                    ) : (
                      <video
                        src={filePreview}
                        className="max-w-xs max-h-48 rounded-lg shadow-lg"
                        controls
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-3 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">{uploadedFile.name}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setFilePreview(null);
                    }}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upload Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-200 via-amber-500 to-amber-50 rounded-2xl flex items-center justify-center shadow-lg">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {/* bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 */}

                  {/* Upload Text */}
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700">
                      Click to upload media
                    </p>
                    <p className="text-gray-500">
                      or drag and drop your file here
                    </p>
                  </div>

                  {/* Supported Formats */}
                  <div className="flex justify-center space-x-6 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4" />
                      <span>Images</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span>Videos</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            {uploadedFile && (
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <button onClick={analyzeIssue} disabled={loadingAnalyze} className="px-12 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-semibold rounded-2xl shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-60">
                  {loadingAnalyze ? 'Analyzing...' : 'Analyze Issue with AI'}
                </button>

                {/* Show coords and results */}
                <div className="mt-4 text-sm text-gray-600">
                  <div>Coordinates: {coords.lat ? coords.lat.toFixed(6) : 'N/A'}, {coords.lon ? coords.lon.toFixed(6) : 'N/A'}</div>
                </div>

                {analyzeResult && (
                  <div className="mt-4 p-4 bg-white/60 rounded-xl border border-white/40">
                    {analyzeResult.pothole_detected ? (
                      <div>
                        <div className="text-red-600 font-semibold">Potholes detected at provided coordinates</div>
                        <div className="mt-3">
                          {analyzeResult.report_sent ? (
                            <div className="mt-2 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                              Report sent to authorities. They will review the submission and take necessary action.
                              <div className="text-sm text-gray-700 mt-2">Coordinates: {analyzeResult.coordinates.lat ? Number(analyzeResult.coordinates.lat).toFixed(6) : 'N/A'}, {analyzeResult.coordinates.lon ? Number(analyzeResult.coordinates.lon).toFixed(6) : 'N/A'}</div>
                              <div className="text-sm text-gray-700">Detections: {analyzeResult.pothole_boxes ? analyzeResult.pothole_boxes.length : 0}</div>
                            </div>
                          ) : (
                            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
                              Detected — failed to send report automatically. You can try again or contact authorities directly.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-green-600 font-semibold">No potholes detected</div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 text-sm text-red-600">{error}</div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Additional Info */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-gray-700">How it works</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Our AI model will automatically analyze your uploaded image/video to detect and classify 
                traffic-related issues such as potholes, road damage, malfunctioning traffic lights, and more. 
                The verification process takes just a few seconds.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Issue;