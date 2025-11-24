import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
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
    angleDifferenceDeg,
    computeEtaSeconds
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
                const angleDiff = angleDifferenceDeg(pos.headingDeg, bearing);
                const ahead = angleDiff !== null && angleDiff <= 90;
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
        const etaSeconds = computeEtaSeconds(nearestAhead.distance, currentPos.speed ?? 0);
        try {
            const payload = {
                userId: user?.userId,
                vehicleId,
                lat: currentPos.lat,
                lon: currentPos.lon,
                heading: headingDeg ?? 0,
                heading_cardinal: headingCardinal,
                speed: currentPos.speed ?? 0,
                distance_m: nearestAhead.distance,
                eta_seconds: etaSeconds
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <Navbar />
            <div className="pt-24 px-6 max-w-6xl mx-auto pb-12 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">Ambulance Dashboard</h1>
                        <p className="text-slate-300">
                            Real-time GPS telemetry, intersection intelligence, and override control.
                        </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full font-semibold text-sm uppercase tracking-widest ${isActive ? 'bg-red-600/20 text-red-300 animate-pulse' : 'bg-emerald-600/20 text-emerald-300'}`}>
                        {isActive ? 'Emergency Signal Active' : 'System Standby'}
                    </div>
                </div>

                {geoError && (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl">
                        {geoError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Vehicle Telemetry</h2>
                                {!warmupComplete && (
                                    <span className="text-amber-300 text-sm font-mono">
                                        Warm-up: {warmupCountdown.toFixed(0)}s
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Latitude</p>
                                    <p className="font-mono text-lg">{telemetry?.lat || '--'}</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Longitude</p>
                                    <p className="font-mono text-lg">{telemetry?.lon || '--'}</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Speed (m/s)</p>
                                    <p className="font-mono text-lg">{telemetry?.speed || '0.00'}</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Heading</p>
                                    <p className="font-mono text-lg">
                                        {headingDeg !== null ? `${headingDeg.toFixed(0)}°` : '--'} ({headingCardinal})
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-3">
                                {warmupComplete ? (
                                    <button
                                        onClick={handleStart}
                                        disabled={isActive || isStarting || !nearestAhead}
                                        className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                                            isActive || isStarting || !nearestAhead
                                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/30'
                                        }`}
                                    >
                                        {isStarting ? 'Requesting...' : 'Start Emergency'}
                                    </button>
                                ) : (
                                    <div className="flex-1 py-3 rounded-2xl bg-slate-700 text-slate-400 text-center font-semibold">
                                        Initializing sensors...
                                    </div>
                                )}
                                {isActive && (
                                    <button
                                        onClick={handleStop}
                                        disabled={isStopping}
                                        className="flex-1 py-3 rounded-2xl font-semibold bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all"
                                    >
                                        {isStopping ? 'Stopping...' : 'Stop Override'}
                                    </button>
                                )}
                            </div>
                            {nearestAhead && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-sm text-emerald-200">
                                    Nearest ahead: <span className="font-semibold">{nearestAhead.intersectionId}</span>{' '}
                                    ({nearestAhead.name || 'Unnamed'}) · {nearestAhead.distance.toFixed(1)} m · Angle Δ{' '}
                                    {nearestAhead.angleDiff?.toFixed(1)}°
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Override Status</h3>
                                <span className="text-xs uppercase tracking-widest text-slate-400">
                                    {driverStatus?.status?.toUpperCase() || 'IDLE'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Intersection</p>
                                    <p className="font-semibold">{driverStatus?.intersectionId || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Lane</p>
                                    <p className="font-semibold">{driverStatus?.targetLane?.toUpperCase() || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Queue Position</p>
                                    <p className="font-semibold">{driverStatus?.queuePosition ?? '--'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">ETA</p>
                                    <p className="font-semibold">
                                        {driverStatus?.eta ? `${driverStatus.eta.toFixed(1)} s` : '--'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Remaining</p>
                                    <p className="font-semibold">
                                        {driverStatus?.remainingSeconds
                                            ? `${Math.max(0, Math.round(driverStatus.remainingSeconds))} s`
                                            : '--'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase">Request ID</p>
                                    <p className="font-mono text-xs break-all">{driverStatus?.requestId || '--'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 rounded-3xl p-4 font-mono text-xs h-48 overflow-y-auto border border-slate-800">
                            {logs.length === 0 ? (
                                <p className="text-slate-500">System logs will appear here...</p>
                            ) : (
                                logs.map((log, idx) => <div key={idx}>{log}</div>)
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Intersections (Read Only)</h3>
                            <span className="text-xs text-slate-400">
                                Updates with each GPS reading
                            </span>
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {annotatedIntersections.length === 0 ? (
                                <p className="text-slate-400 text-sm">No intersections available.</p>
                            ) : (
                                annotatedIntersections.map((intersection) => {
                                    const isNearest = nearestAhead && intersection.intersectionId === nearestAhead.intersectionId;
                                    return (
                                        <div
                                            key={intersection.intersectionId}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                intersection.ahead
                                                    ? isNearest
                                                        ? 'bg-emerald-500/15 border-emerald-500/40'
                                                        : 'bg-emerald-500/5 border-emerald-500/20'
                                                    : 'bg-slate-900/40 border-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold">
                                                        {intersection.intersectionId}{' '}
                                                        <span className="text-slate-400 font-normal">
                                                            · {intersection.name || 'Unnamed'}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-mono">
                                                        {intersection.lat.toFixed(5)}, {intersection.lon.toFixed(5)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold">{intersection.distance.toFixed(0)} m</p>
                                                    <p className="text-xs text-slate-400">
                                                        Δ {intersection.angleDiff?.toFixed(1) ?? '--'}° · Bearing{' '}
                                                        {intersection.bearing?.toFixed(0) ?? '--'}°
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs uppercase tracking-widest">
                                                {intersection.ahead ? (
                                                    <span className={`px-2 py-1 rounded-full ${isNearest ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-900/60 text-emerald-200'}`}>
                                                        Ahead
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                                                        Behind
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Backend Response</h3>
                    {backendResponse ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Status</p>
                                <p className="font-semibold">{backendResponse.status?.toUpperCase()}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Intersection</p>
                                <p className="font-semibold">{backendResponse.intersectionId}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Lane</p>
                                <p className="font-semibold">{backendResponse.targetLane?.toUpperCase() || '--'}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Distance</p>
                                <p className="font-semibold">
                                    {backendResponse.distance ? `${backendResponse.distance.toFixed(1)} m` : '--'}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">ETA</p>
                                <p className="font-semibold">
                                    {backendResponse.eta ? `${backendResponse.eta.toFixed(1)} s` : '--'}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Queue Position</p>
                                <p className="font-semibold">{backendResponse.queuePosition ?? 0}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-slate-400 text-xs uppercase">Request ID</p>
                                <p className="font-mono break-all text-xs">{backendResponse.requestId}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">Waiting for override session...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AmbulanceDashboard;
