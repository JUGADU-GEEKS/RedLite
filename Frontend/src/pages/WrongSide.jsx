import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UploadCloud, FileVideo, AlertTriangle, CheckCircle, ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Floating elements for background decoration
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  >
    {children}
  </motion.div>
);

const WrongSide = () => {
    const [detectedPlates, setDetectedPlates] = useState([]);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const navigate = useNavigate();
    const wsRef = useRef(null);

    const handleStartAnalysis = async () => {
        setMessage('Starting real-time analysis...');
        setError('');
        setDetectedPlates([]);
        setCurrentFrame(null);
        setProcessing(true);

        // Close existing connection if any
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close();
        }

        try {
            // Connect to WebSocket for streaming with static file
            const filename = "wrongside.mp4";
            const wsUrl = `ws://localhost:8000/ws/wrong-side/${filename}`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log("WebSocket Connected");
                setMessage('Connected. Processing video...');
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.frame) {
                        setCurrentFrame(`data:image/jpeg;base64,${data.frame}`);
                    }
                    
                    if (data.detected_plates && Array.isArray(data.detected_plates)) {
                        setDetectedPlates(data.detected_plates);
                    }

                    if (data.status === "complete") {
                        setProcessing(false);
                        setMessage("Analysis Complete.");
                        if (wsRef.current) {
                            wsRef.current.close();
                        }
                    }
                    
                    if (data.error) {
                        setError(`Error: ${data.error}`);
                        setProcessing(false);
                        if (wsRef.current) {
                            wsRef.current.close();
                        }
                    }
                } catch (parseError) {
                    console.error("Error parsing WebSocket message:", parseError);
                }
            };

            wsRef.current.onerror = (err) => {
                console.error("WebSocket Error:", err);
                setError("Connection error during streaming. Please ensure the backend server is running.");
                setProcessing(false);
            };

            wsRef.current.onclose = (event) => {
                console.log("WebSocket Disconnected", event.code, event.reason);
                if (processing && event.code !== 1000) {
                    // Unexpected close
                    if (!error) {
                        setError("Connection closed unexpectedly. Please try again.");
                    }
                    setProcessing(false);
                }
            };

        } catch (err) {
            console.error('Error starting analysis:', err);
            setError('Error starting analysis. Please check the console for details and try again.');
            setMessage('');
            setProcessing(false);
        }
    };

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
                <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

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

            <div className="relative z-10 flex flex-col items-center p-4 transition-colors duration-500" style={{ paddingTop: '5.5rem' }}>
                <motion.button
                  onClick={() => navigate(-1)}
                  className="fixed top-24 left-8 z-50 flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium shadow-lg"
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

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif leading-tight">
                        Wrong-Side Vehicle Detection
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-8"></div>
                    <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-600 leading-relaxed font-light">
                        Detect vehicles traveling on the wrong side and identify their license plates in real-time.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-[3px] border-gray-300/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:bg-white/90 transition-all duration-500"
                >
                    <div className="flex flex-col items-center justify-center w-full mb-6">
                        <div className="w-full rounded-xl overflow-hidden shadow-lg border-2 border-amber-200 bg-black">
                            <video 
                                src="/Videos/wrongside.mp4" 
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-auto"
                            />
                        </div>
                    </div>

                    <motion.button
                        onClick={handleStartAnalysis}
                        disabled={processing}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 flex items-center justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {processing ? (
                            <>
                                <Activity className="w-5 h-5 mr-2 animate-pulse" />
                                Processing Live Stream...
                            </>
                        ) : 'Start Real-Time Detection'}
                    </motion.button>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-red-500 flex items-center justify-center font-medium"
                        >
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            {error}
                        </motion.div>
                    )}
                </motion.div>

                {(message || detectedPlates.length > 0 || currentFrame) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-[3px] border-gray-300/50 rounded-2xl p-8 shadow-xl mt-8"
                    >
                        {message && (
                            <div className="flex items-center justify-center text-center mb-4">
                                <CheckCircle className="w-6 h-6 mr-3 text-emerald-500" />
                                <p className="text-lg text-gray-700 font-medium">{message}</p>
                            </div>
                        )}

                        {currentFrame && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Live Analysis</h2>
                                <div className="rounded-xl overflow-hidden shadow-lg border-2 border-amber-200 bg-black">
                                    <img 
                                        src={currentFrame} 
                                        alt="Live Analysis" 
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        )}

                        {detectedPlates.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Detected License Plates</h2>
                                <ul className="space-y-3 text-center">
                                    {detectedPlates.map((plate, index) => (
                                        <li key={index} className="bg-white border border-gray-200 p-3 rounded-xl font-mono text-lg tracking-widest text-gray-800 shadow-sm">
                                            {plate}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default WrongSide;
