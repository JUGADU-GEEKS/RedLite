import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import AmbulanceMap from '../components/AmbulanceMap';
import {
    startEmergency,
    sendHeartbeat,
    stopEmergency,
    getIntersections,
    getEmergencyStatus
} from '../services/emergency';
import { useAuth } from '../services/auth';
import {
    headingToCardinal,
    deriveHeadingDeg,
    haversineDistanceMeters,
    calculateBearingDeg,
    angleDifferenceDeg
} from '../utils/geo';

const GEO_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
};
const WARMUP_DURATION_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 2000;

const AmbulanceDashboard = () => {
    const { user } = useAuth();
    const vehicleId = user?.ambulanceInfo?.vehicleId || 'AMB-DEMO';

    const [currentPos, setCurrentPos] = useState(null);
    const [headingDeg, setHeadingDeg] = useState(null);
    const [headingCardinal, setHeadingCardinal] = useState('--');
    const [warmupComplete, setWarmupComplete] = useState(false);
    const [warmupCountdown, setWarmupCountdown] = useState(WARMUP_DURATION_MS / 1000);
    const [geoError, setGeoError] = useState('');
    const [intersections, setIntersections] = useState([]);
    const [annotatedIntersections, setAnnotatedIntersections] = useState([]);
    const [nearestAhead, setNearestAhead] = useState(null);
    const [backendResponse, setBackendResponse] = useState(null);
    const [driverStatus, setDriverStatus] = useState(null);
    const [overrideSnapshot, setOverrideSnapshot] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    const watchIdRef = useRef(null);
    const lastPosRef = useRef(null);
    const heartbeatRef = useRef(null);
    const requestIdRef = useRef(null);
    const warmupTimerRef = useRef(null);
    const warmupCountdownRef = useRef(null);
    const statusPollRef = useRef(null);
    const currentPosRef = useRef(null);
    const headingRef = useRef(null);

    const addLog = (msg) => {
        setLogs((prev) => {
            const next = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev];
            return next.slice(0, 25);
        });
    };

    const clearHeartbeat = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    const cleanupAll = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        clearHeartbeat();
        if (warmupTimerRef.current) {
            clearTimeout(warmupTimerRef.current);
            warmupTimerRef.current = null;
        }
        if (warmupCountdownRef.current) {
            clearInterval(warmupCountdownRef.current);
            warmupCountdownRef.current = null;
        }
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
        }
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by this browser.');
            return;
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const coords = pos.coords;
                const snapshot = {
                    lat: coords.latitude,
                    lon: coords.longitude,
                    speed: typeof coords.speed === 'number' ? coords.speed : 0,
                    headingNative: typeof coords.heading === 'number' ? coords.heading : null,
                    accuracy: coords.accuracy,
                    ts: pos.timestamp || Date.now()
                };
                const derivedHeading = deriveHeadingDeg(snapshot, lastPosRef.current);
                setHeadingDeg(derivedHeading);
                setHeadingCardinal(headingToCardinal(derivedHeading));
                const nextPos = { ...snapshot, headingDeg: derivedHeading };
                lastPosRef.current = { lat: snapshot.lat, lon: snapshot.lon };
                currentPosRef.current = nextPos;
                headingRef.current = derivedHeading;
                setCurrentPos(nextPos);
            },
            (err) => {
                console.error(err);
                setGeoError(err.message || 'Unable to read GPS signal');
            },
            GEO_OPTIONS
        );

        warmupTimerRef.current = setTimeout(() => {
            setWarmupComplete(true);
            setWarmupCountdown(0);
            if (warmupCountdownRef.current) {
                clearInterval(warmupCountdownRef.current);
                warmupCountdownRef.current = null;
            }
        }, WARMUP_DURATION_MS);

        warmupCountdownRef.current = setInterval(() => {
            setWarmupCountdown((prev) => {
                const next = Math.max(0, prev - 1);
                return next;
            });
        }, 1000);

        return cleanupAll;
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getIntersections();
                if (!cancelled) {
                    setIntersections(data);
                }
            } catch (error) {
                console.error(error);
                setGeoError('Unable to load intersections');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!currentPos) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await getIntersections();
                if (!cancelled) {
                    setIntersections(data);
                }
            } catch (error) {
                console.error(error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentPos?.lat, currentPos?.lon]);

    const annotate = (list, pos) => {
        if (!pos || !list?.length) {
            setAnnotatedIntersections([]);
            setNearestAhead(null);
            return;
        }
        const enriched = list
            .map((intersection) => {
                const coords = intersection.coordinates || {};
                if (typeof coords.lat !== 'number' || typeof coords.lon !== 'number') {
                    return null;
                }
                const distance = haversineDistanceMeters(pos.lat, pos.lon, coords.lat, coords.lon);
                const bearing = calculateBearingDeg(pos.lat, pos.lon, coords.lat, coords.lon);

                let ahead = false;
                let angleDiff = null;

                if (pos.headingDeg !== null) {
                    angleDiff = angleDifferenceDeg(pos.headingDeg, bearing);
                    ahead = angleDiff !== null && angleDiff <= 90;
                } else {
                    ahead = true;
                }

                return {
                    ...intersection,
                    lat: coords.lat,
                    lon: coords.lon,
                    distance,
                    bearing,
                    angleDiff,
                    ahead
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance);
        setAnnotatedIntersections(enriched);
        const aheadNearest = enriched.find((item) => item.ahead);
        setNearestAhead(aheadNearest || null);
    };

    useEffect(() => {
        if (!currentPos || intersections.length === 0) return;
        annotate(intersections, currentPos);
    }, [intersections, currentPos?.lat, currentPos?.lon, currentPos?.headingDeg]);

    useEffect(() => {
        const pollStatus = async () => {
            try {
                const status = await getEmergencyStatus();
                setDriverStatus(status);
                if (status?.status === 'idle' && overrideSnapshot) {
                    addLog('Override returned to IDLE');
                    setOverrideSnapshot(null);
                    requestIdRef.current = null;
                    clearHeartbeat();
                }
            } catch (error) {
                console.error('Status poll failed', error);
            }
        };

        pollStatus();
        statusPollRef.current = setInterval(pollStatus, 5000);
        return () => {
            if (statusPollRef.current) {
                clearInterval(statusPollRef.current);
                statusPollRef.current = null;
            }
        };
    }, [overrideSnapshot]);

    const startHeartbeat = (requestId) => {
        clearHeartbeat();
        requestIdRef.current = requestId;
        heartbeatRef.current = setInterval(async () => {
            const latest = currentPosRef.current;
            if (!latest || !requestIdRef.current) return;
            try {
                const hb = await sendHeartbeat({
                    lat: latest.lat,
                    lon: latest.lon,
                    heading: headingRef.current ?? 0,
                    speed: latest.speed ?? 0,
                    requestId: requestIdRef.current,
                    vehicleId
                });
                setBackendResponse(hb);
                if (hb.status === 'cleared') {
                    addLog('Override cleared by system');
                    clearHeartbeat();
                    setOverrideSnapshot(null);
                    requestIdRef.current = null;
                }
            } catch (error) {
                console.error('Heartbeat error', error);
                addLog(`Heartbeat error: ${error.response?.data?.detail || error.message}`);
            }
        }, HEARTBEAT_INTERVAL_MS);
    };

    const handleStart = async () => {
        if (!currentPos) {
            setGeoError('Waiting for GPS fix...');
            return;
        }
        if (!nearestAhead) {
            setGeoError('No intersection ahead');
            return;
        }
        setIsStarting(true);
        try {
            const effectiveHeading = headingDeg ?? nearestAhead.bearing ?? 0;

            const payload = {
                userId: user?.userId,
                vehicleId,
                lat: currentPos.lat,
                lon: currentPos.lon,
                heading: effectiveHeading,
                heading_cardinal: headingCardinal,
                speed: currentPos.speed ?? 0,
                distance_m: nearestAhead.distance
            };
            const response = await startEmergency(payload);
            setBackendResponse(response);
            setOverrideSnapshot({
                ...payload,
                requestId: response.requestId,
                intersection: nearestAhead
            });
            addLog(`Override requested for ${nearestAhead.intersectionId} (${nearestAhead.name || 'Unnamed'})`);
            startHeartbeat(response.requestId);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.detail || error.message;
            setGeoError(detail);
            addLog(`Start error: ${detail}`);
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        if (!overrideSnapshot?.requestId) {
            setOverrideSnapshot(null);
            clearHeartbeat();
            return;
        }
        setIsStopping(true);
        try {
            await stopEmergency({
                requestId: overrideSnapshot.requestId,
                userId: user?.userId,
                vehicleId
            });
            addLog('Override stopped manually');
        } catch (error) {
            console.error(error);
            addLog(`Stop error: ${error.response?.data?.detail || error.message}`);
        } finally {
            clearHeartbeat();
            setBackendResponse(null);
            setOverrideSnapshot(null);
            requestIdRef.current = null;
            setIsStopping(false);
        }
    };

    const isActive = Boolean(overrideSnapshot);
    const telemetry = currentPos
        ? {
            lat: currentPos.lat.toFixed(6),
            lon: currentPos.lon.toFixed(6),
            speed: (currentPos.speed || 0).toFixed(2)
        }
        : null;

    const normalizedCurrentPos = currentPos
      ? {
          lat: Number(currentPos.lat ?? currentPos.latitude ?? currentPos.latitude_deg ?? currentPos.latDeg),
          lon: Number(currentPos.lon ?? currentPos.lng ?? currentPos.longitude ?? currentPos.lon),
          headingDeg: Number(currentPos.headingDeg ?? headingDeg ?? currentPos.heading ?? 0),
          speed: Number(currentPos.speed ?? 0),
        }
      : null;

    const normalizedIntersections = (annotatedIntersections && annotatedIntersections.length)
      ? annotatedIntersections.map(ix => ({
          ...ix,
          lat: Number(ix.lat ?? ix.latitude ?? ix.lat_deg ?? ix.latDeg),
          lon: Number(ix.lon ?? ix.lng ?? ix.longitude ?? ix.lon),
        }))
      : (intersections || []).map(ix => ({
          ...ix,
          lat: Number(ix.lat ?? ix.latitude ?? ix.lat_deg ?? ix.latDeg),
          lon: Number(ix.lon ?? ix.lng ?? ix.longitude ?? ix.lon),
        }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
            {/* decorative orbs */}
            <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
            <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

            <Navbar />

            <div className="pt-28 px-6 max-w-7xl mx-auto pb-12 relative z-10">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-10">
                    <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
                        Ambulance Dashboard
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
                    <p className="text-lg text-gray-700">Real-time GPS telemetry, intersection intelligence, and override control.</p>
                </motion.div>

                {/* Small status / debug */}
                {geoError && (
                    <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                        <AlertCircle size={18} className="inline-block mr-2 align-middle" /> <span>{geoError}</span>
                    </div>
                )}

                <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur p-6 rounded-3xl shadow-xl border border-white/60">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Device Location</h3>
                                    <p className="text-sm text-gray-500">Live coordinates from this device</p>
                                </div>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isActive ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {isActive ? 'Emergency Active' : 'System Standby'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                            <div>
                                <p className="text-gray-500 uppercase text-xs">Latitude</p>
                                <p className="text-lg">{telemetry?.lat || '--'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 uppercase text-xs">Longitude</p>
                                <p className="text-lg">{telemetry?.lon || '--'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 uppercase text-xs">Heading</p>
                                <p className="text-lg">{headingCardinal !== '--' ? headingCardinal : (nearestAhead ? headingToCardinal(nearestAhead.bearing) : 'Unknown')}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 uppercase text-xs">Speed (m/s)</p>
                                <p className="text-lg">{telemetry?.speed ?? '--'}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            {warmupComplete ? (
                                <button
                                    onClick={handleStart}
                                    disabled={isActive || isStarting || !nearestAhead}
                                    className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                                        isActive || isStarting || !nearestAhead
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg'
                                    }`}
                                >
                                    {isStarting ? 'Requesting...' : 'Start Emergency'}
                                </button>
                            ) : (
                                <div className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 text-center font-semibold">
                                    Initializing sensors... {warmupCountdown}s
                                </div>
                            )}

                            {isActive && (
                                <button
                                    onClick={handleStop}
                                    disabled={isStopping}
                                    className="py-3 px-6 rounded-2xl font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg"
                                >
                                    {isStopping ? 'Stopping...' : 'Stop Override'}
                                </button>
                            )}
                        </div>

                        {nearestAhead && (
                            <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-800">
                                Nearest ahead: <span className="font-semibold">{nearestAhead.intersectionId}</span> ({nearestAhead.name || 'Unnamed'}) · {nearestAhead.distance.toFixed(1)} m · Δ {nearestAhead.angleDiff?.toFixed(1)}°
                            </div>
                        )}
                    </div>

                    <div className="bg-white/70 backdrop-blur p-6 rounded-3xl shadow-xl border border-white/60">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Live Overview</h3>
                                    <p className="text-sm text-gray-500">Telemetry & override snapshot</p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">{annotatedIntersections.length} intersections</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-xl border">
                                <p className="text-xs text-gray-500">Current Override</p>
                                <p className="font-bold text-gray-900">{driverStatus?.status ?? 'IDLE'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border">
                                <p className="text-xs text-gray-500">Remaining</p>
                                <p className="font-bold text-gray-900">{driverStatus?.remainingSeconds ? `${Math.round(driverStatus.remainingSeconds)} s` : '--'}</p>
                            </div>
                            <div className="col-span-2 bg-white p-3 rounded-xl border">
                                <p className="text-xs text-gray-500">Request</p>
                                <p className="font-mono text-sm break-all">{backendResponse?.requestId ?? '--'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Live Map</h3>
                                <div className="text-sm text-gray-500">Ambulance & intersections</div>
                            </div>
                            <AmbulanceMap
                                currentPos={normalizedCurrentPos}
                                intersections={normalizedIntersections}
                                nearestAhead={nearestAhead}
                                isActive={isActive}
                                initialCenter={normalizedCurrentPos ? [normalizedCurrentPos.lat, normalizedCurrentPos.lon] : undefined}
                            />
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
                            <h3 className="text-lg font-bold mb-3">Activity Logs</h3>
                            <div className="bg-gray-50 p-3 rounded-lg h-44 overflow-y-auto font-mono text-sm text-gray-700">
                                {logs.length === 0 ? <div className="text-gray-400">System logs will appear here...</div> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
                            <h3 className="text-lg font-bold mb-3">Controls</h3>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleStart} className="py-3 bg-amber-500 text-white rounded-xl shadow">Start Emergency</button>
                                <button onClick={handleStop} className="py-3 bg-white border rounded-xl">Stop Emergency</button>
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/50">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold">Nearby Intersections</h3>
                                <span className="text-sm text-gray-500">{annotatedIntersections.length}</span>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {annotatedIntersections.length === 0 ? (
                                    <div className="text-gray-500">No intersections available.</div>
                                ) : annotatedIntersections.map((intersection) => {
                                    const isNearest = nearestAhead && intersection.intersectionId === nearestAhead.intersectionId;
                                    return (
                                        <div key={intersection.intersectionId} className="p-3 rounded-lg border bg-white">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-semibold">{intersection.intersectionId} <span className="text-sm text-gray-500">· {intersection.name || 'Unnamed'}</span></div>
                                                    <div className="text-xs text-gray-500 font-mono">{intersection.lat.toFixed(5)}, {intersection.lon.toFixed(5)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">{Math.round(intersection.distance)} m</div>
                                                    <div className="text-xs text-gray-500">Δ {intersection.angleDiff?.toFixed(1) ?? '--'}°</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AmbulanceDashboard;
