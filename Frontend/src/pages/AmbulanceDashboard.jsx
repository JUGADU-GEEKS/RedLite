import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { startEmergency, sendHeartbeat, stopEmergency } from '../services/emergency';
import { useNavigate } from 'react-router-dom';

// Simulation Constants
// INT-03 Coordinates: 28.4701121, 77.2097888
const TARGET_LAT = 28.4701121;
const TARGET_LON = 77.2097888;
const START_LAT = 28.4650; // ~500m South
const START_LON = 77.2097888;
const SIMULATION_SPEED = 15; // m/s (~54 km/h)
const UPDATE_INTERVAL = 1000; // 1 second

const AmbulanceDashboard = () => {
    const navigate = useNavigate();
    const [active, setActive] = useState(false);
    const [status, setStatus] = useState('IDLE'); // IDLE, REQUESTING, ACTIVE, CLEARED
    const [location, setLocation] = useState({ lat: START_LAT, lon: START_LON, heading: 0 });
    const [backendResponse, setBackendResponse] = useState(null);
    const [logs, setLogs] = useState([]);
    const intervalRef = useRef(null);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
    };

    const handleStart = async () => {
        try {
            addLog("Starting Emergency Request...");
            const data = {
                lat: location.lat,
                lon: location.lon,
                heading: location.heading,
                speed: SIMULATION_SPEED,
                vehicleId: "AMB-DEMO-01"
            };
            const res = await startEmergency(data);
            setBackendResponse(res);
            setStatus('ACTIVE');
            setActive(true);
            addLog(`Override Started: ETA ${res.eta.toFixed(1)}s`);
            
            // Start Simulation Loop
            intervalRef.current = setInterval(simulationLoop, UPDATE_INTERVAL);
        } catch (error) {
            console.error(error);
            addLog(`Error: ${error.response?.data?.detail || error.message}`);
            setStatus('ERROR');
        }
    };

    const handleStop = async () => {
        try {
            await stopEmergency();
            clearInterval(intervalRef.current);
            setActive(false);
            setStatus('IDLE');
            setBackendResponse(null);
            addLog("Emergency Stopped Manually");
            // Reset location
            setLocation({ lat: START_LAT, lon: START_LON, heading: 0 });
        } catch (error) {
            console.error(error);
        }
    };

    const simulationLoop = async () => {
        setLocation(prev => {
            // Simple movement logic: Move North towards target
            // 1 deg lat ~= 111000 meters
            const distMoved = SIMULATION_SPEED * (UPDATE_INTERVAL / 1000);
            const degChange = distMoved / 111000;
            
            const newLat = prev.lat + degChange;
            
            // Check if passed
            if (newLat > TARGET_LAT + 0.0005) { // Passed by ~50m
                 // Stop automatically handled by backend response usually, but we simulate here
            }

            const newLoc = { ...prev, lat: newLat };
            
            // Send Heartbeat
            sendHeartbeat({
                lat: newLoc.lat,
                lon: newLoc.lon,
                heading: newLoc.heading,
                speed: SIMULATION_SPEED
            }).then(res => {
                setBackendResponse(res);
                if (res.status === 'cleared') {
                    addLog("System Cleared Override (Passed Intersection)");
                    clearInterval(intervalRef.current);
                    setActive(false);
                    setStatus('CLEARED');
                } else {
                    // addLog(`Heartbeat: ETA ${res.eta.toFixed(1)}s | Status: ${res.status}`);
                }
            }).catch(err => {
                addLog(`Heartbeat Error: ${err.message}`);
            });

            return newLoc;
        });
    };

    useEffect(() => {
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="pt-24 px-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Ambulance Control Unit</h1>
                        <div className={`px-4 py-2 rounded-full font-bold ${
                            active ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'
                        }`}>
                            {active ? 'EMERGENCY ACTIVE' : 'SYSTEM STANDBY'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Controls */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold mb-2">Simulation Controls</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Simulate driving North towards Intersection INT-03.
                                </p>
                                <div className="flex gap-4">
                                    {!active ? (
                                        <button 
                                            onClick={handleStart}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                                        >
                                            START EMERGENCY
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleStop}
                                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                                        >
                                            STOP / RESET
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">Vehicle Telemetry</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Speed</span>
                                        <div className="font-mono text-lg">{active ? SIMULATION_SPEED : 0} m/s</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Heading</span>
                                        <div className="font-mono text-lg">{location.heading}° (N)</div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Location</span>
                                        <div className="font-mono text-xs truncate">
                                            {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Display */}
                        <div className="space-y-4">
                            <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono h-full flex flex-col">
                                <h3 className="text-white border-b border-gray-700 pb-2 mb-4">System Status</h3>
                                
                                {backendResponse ? (
                                    <div className="space-y-3 flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Target:</span>
                                            <span className="text-white">{backendResponse.intersectionName || backendResponse.intersectionId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Lock Status:</span>
                                            <span className={backendResponse.status === 'active' ? 'text-red-500 font-bold' : 'text-yellow-500'}>
                                                {backendResponse.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Target Lane:</span>
                                            <span className="text-white">{backendResponse.targetLane?.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Distance:</span>
                                            <span className="text-white">{backendResponse.distance?.toFixed(0)}m</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ETA:</span>
                                            <span className="text-xl font-bold text-white">{backendResponse.eta?.toFixed(1)}s</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-600 italic">
                                        Waiting for signal...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="mt-6 bg-black text-green-500 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        {logs.length === 0 && <div className="text-gray-600">System logs will appear here...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AmbulanceDashboard;
