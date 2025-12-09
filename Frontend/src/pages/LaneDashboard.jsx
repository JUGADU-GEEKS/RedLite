import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import LaneCard from '../components/LaneCard';
import Navbar from '../components/Navbar';
import { useAuth } from '../services/auth';

// README: Priority round-robin timing.
// - Cycle order is given by priorityOrder; it defines the deterministic loop.
// - Waiting time for a lane = active remaining + sum of green durations of
//   lanes encountered after the active lane (following priorityOrder) until
//   that lane is reached. Active lane shows its own remaining.
// - Non-active lanes clamp to >= 1s to avoid 0s flicker.
const LaneDashboard = () => {
  const { intersectionId } = useParams();
  const [data, setData] = useState({});
  const [signalStatus, setSignalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth() || {};

  const lastGreenLaneRef = useRef(null); // track last spoken green lane
  const [durations, setDurations] = useState({});
  const durationsRef = useRef({});
  const [priorityOrder, setPriorityOrder] = useState([]);
  const priorityOrderRef = useRef([]);
  const [activeLane, setActiveLane] = useState(null);
  const activeLaneRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const [waitingTimes, setWaitingTimes] = useState({});

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const lanes = ['north', 'east', 'south', 'west'];

  const calculateWaitingTimesPriorityRoundRobin = (lanesArr, order, durationMap, laneActive, activeRemaining) => {
    if (!laneActive || !lanesArr.length) return {};
    const fullOrder = (order && order.length ? order : lanesArr).filter(Boolean);
    const allLanes = Array.from(new Set([...fullOrder, ...lanesArr]));
    const activeIdx = allLanes.indexOf(laneActive);
    if (activeIdx === -1) return {};
    const activeDuration = durationMap?.[laneActive] ?? 0;
    const safeRemaining = Math.min(Math.max(activeRemaining ?? 0, 0), activeDuration);

    return allLanes.reduce((acc, lane) => {
      if (lane === laneActive) {
        acc[lane] = safeRemaining;
        return acc;
      }

      let sum = safeRemaining;
      let cursor = activeIdx;
      while (true) {
        cursor = (cursor + 1) % allLanes.length;
        const cursorLane = allLanes[cursor];
        if (cursorLane === lane || cursor === activeIdx) {
          break; // do not include target lane duration
        }
        sum += durationMap?.[cursorLane] ?? 0;
      }

      acc[lane] = sum <= 0 ? 1 : sum;
      return acc;
    }, {});
  };

  // Quick correctness harness (logs once)
  useEffect(() => {
    const sampleLanes = ['N', 'E', 'S', 'W'];
    const sampleDur = { N: 15, E: 60, S: 45, W: 30 };
    console.log('Waiting sample active N remaining 15', calculateWaitingTimesPriorityRoundRobin(sampleLanes, sampleLanes, sampleDur, 'N', 15));
    console.log('Waiting sample active E remaining 6', calculateWaitingTimesPriorityRoundRobin(sampleLanes, sampleLanes, sampleDur, 'E', 6));
    // When remaining is 0 we expect to switch to next lane (W) with its duration.
    const waitsS0 = calculateWaitingTimesPriorityRoundRobin(sampleLanes, sampleLanes, sampleDur, 'S', 0);
    const nextLaneFromS = sampleLanes[(sampleLanes.indexOf('S') + 1) % sampleLanes.length];
    console.log('Waiting sample active S remaining 0', { waits: waitsS0, nextLane: nextLaneFromS, nextLaneDuration: sampleDur[nextLaneFromS] });
  }, []);

  useEffect(() => {
    const fetchSignalStatus = async () => {
      if (!intersectionId) return;

      try {
        const response = await fetch(`${API_BASE}/signal_status/${intersectionId}`);
        if (response.ok) {
          const status = await response.json();
          setSignalStatus(status);
        } else {
          console.warn(`Signal status not found for ${intersectionId}`);
        }
      } catch (error) {
        console.error('Error fetching signal status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignalStatus();
  }, [intersectionId, API_BASE]);

  // Speak the lane name whenever the green light changes to a different lane
  useEffect(() => {
    const currentLane = signalStatus?.currentLane;
    const phase = signalStatus?.phase;

    if (phase === 'green' && currentLane && lastGreenLaneRef.current !== currentLane) {
      lastGreenLaneRef.current = currentLane;

      // Use Web Speech API if available
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel(); // stop any ongoing speech

          const speak = (text) => {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'en-US';
            utter.rate = 1;
            utter.pitch = 1;

            const pickFemaleVoice = (voices) => {
              // Prefer known female voice names, then en-US voices, then fallback
              const femaleNames = /female|zira|samantha|kendra|joanna|amy|susan|kate|victoria|alloy|nicky|alyssa|maria/i;
              let v = voices.find((v) => femaleNames.test(v.name));
              if (!v) v = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en-us'));
              if (!v) v = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
              if (!v) v = voices[0];
              return v;
            };

            let voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) {
              // voices may not be loaded yet — wait for the event
              window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                const voice = pickFemaleVoice(voices);
                if (voice) utter.voice = voice;
                window.speechSynthesis.speak(utter);
              };
            } else {
              const voice = pickFemaleVoice(voices);
              if (voice) utter.voice = voice;
              window.speechSynthesis.speak(utter);
            }
          };

          speak(currentLane);
        } catch (e) {
          console.error('Speech synthesis error:', e);
        }
      } else {
        // Fallback log for environments without Web Speech API
        console.log('Green lane changed to:', currentLane);
      }
    }
  }, [signalStatus]);

  useEffect(() => {
    const q = intersectionId ? `?intersectionId=${encodeURIComponent(intersectionId)}` : '';
    const ws = new WebSocket(`ws://localhost:8000/ws/lane_feed${q}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
      if (message.durations) {
        setDurations(message.durations);
        durationsRef.current = message.durations;
      }
      if (message.priority_order && Array.isArray(message.priority_order)) {
        const mergedOrder = Array.from(new Set([...message.priority_order, ...lanes]));
        setPriorityOrder(mergedOrder);
        priorityOrderRef.current = mergedOrder;
      }
      if (message.lane) {
        setActiveLane(message.lane);
        activeLaneRef.current = message.lane;
      }
      if (message.remaining !== undefined) {
        const dur = (message.durations || durationsRef.current || {})[message.lane] ?? message.remaining;
        const clamped = Math.min(Math.max(message.remaining, 0), dur);
        setRemaining(clamped);
      }
      if (message.lights && message.phase) {
        setSignalStatus({
          state: message.lights,
          currentLane: message.lane,
          remainingTime: message.remaining,
          phase: message.phase,
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [token, intersectionId]);

  useEffect(() => {
    durationsRef.current = durations;
    if (activeLane) {
      const dur = durations?.[activeLane] ?? 0;
      setRemaining((prev) => Math.min(Math.max(prev, 0), dur));
    }
  }, [durations, activeLane]);

  useEffect(() => {
    activeLaneRef.current = activeLane;
  }, [activeLane]);

  const currentLane = activeLane;
  const remainingSeconds = remaining || 0;
  const currentPhase = activeLane ? data.phase || 'green' : 'red';
  const isOverride = data.override_active;

  // Single ticker driving all timers
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        const active = activeLaneRef.current;
        const order = priorityOrderRef.current.length ? priorityOrderRef.current : lanes;
        if (!active || !order.length) return 0;
        const dur = durationsRef.current?.[active] ?? 0;
        const clampedPrev = Math.min(Math.max(prev, 0), dur);

        if (clampedPrev > 0) {
          const nextVal = clampedPrev - 1;
          const waits = calculateWaitingTimesPriorityRoundRobin(lanes, order, durationsRef.current, active, nextVal);
          setWaitingTimes(waits);
          return nextVal;
        }

        const activeIdx = order.indexOf(active);
        const nextLane = activeIdx === -1 ? order[0] : order[(activeIdx + 1) % order.length];
        const nextDur = durationsRef.current?.[nextLane] ?? 0;
        const clampedNext = Math.min(Math.max(nextDur, 0), nextDur || 0);
        activeLaneRef.current = nextLane;
        setActiveLane(nextLane);
        const waits = calculateWaitingTimesPriorityRoundRobin(lanes, order, durationsRef.current, nextLane, clampedNext);
        setWaitingTimes(waits);
        return clampedNext;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lanes]);

  // recompute waiting times on tick or data change
  useEffect(() => {
    const computed = calculateWaitingTimesPriorityRoundRobin(lanes, priorityOrderRef.current, durations, currentLane, remainingSeconds);
    setWaitingTimes(computed);
  }, [lanes, durations, currentLane, remainingSeconds]);

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        isOverride ? 'bg-red-50' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'
      }`}
    >
      {/* Emergency Override Overlay */}
      {isOverride && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
          <div className="bg-red-600 text-white px-12 py-6 rounded-3xl shadow-2xl transform animate-bounce border-4 border-white/50">
            <h1 className="text-5xl font-black tracking-wider flex items-center gap-4">
              <span className="text-6xl">🚑</span>
              EMERGENCY OVERRIDE
              <span className="text-6xl">🚨</span>
            </h1>
            <p className="text-center text-xl font-bold mt-2 text-red-100">
              AMBULANCE APPROACHING - {data.override_direction?.toUpperCase()} LANE GREEN
            </p>
          </div>
        </div>
      )}

      {/* Soft gradient orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>

      <Navbar />
      <div className="pt-28 px-6 max-w-7xl mx-auto pb-12 relative z-10">
        {/* Emergency Override Banner */}
        {isOverride && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-0 right-0 z-50 flex justify-center px-4"
          >
            <div className="bg-red-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 border-4 border-red-400 animate-pulse">
              <span className="text-3xl">🚑</span>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-wider">Emergency Override Active</h3>
                <p className="text-red-100 font-medium">
                  Allowing ambulance from <span className="text-white font-bold underline uppercase">{data.override_direction}</span> lane
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif">
            Traffic Lane Dashboard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
          <p className="text-lg text-gray-700">
            {intersectionId ? `📍 Intersection: ${intersectionId}` : 'Real-time traffic monitoring'}
          </p>
        </motion.div>

        {/* Signal Status Card */}
        {signalStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 backdrop-blur-sm bg-white/60 border border-white/50 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
          >
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              <span className="text-3xl">📊</span>
              Signal Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current Lane', value: signalStatus.currentLane || 'None', icon: '🛣' },
                {
                  label: 'Phase',
                  value: signalStatus.phase?.toUpperCase() || 'RED',
                  color:
                    signalStatus.phase === 'green'
                      ? 'text-emerald-600'
                      : signalStatus.phase === 'yellow'
                      ? 'text-amber-600'
                      : 'text-red-600',
                  icon: signalStatus.phase === 'green' ? '🟢' : signalStatus.phase === 'yellow' ? '🟡' : '🔴',
                },
                { label: 'Remaining', value: `${signalStatus.remainingTime || 0}s`, icon: '⏱' },
                { label: 'Status', value: signalStatus.state ? 'Active' : 'Inactive', icon: '✅' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/60 hover:border-amber-300/60 transition-all shadow-md hover:shadow-lg"
                >
                  <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
                    <span>{item.icon}</span>
                    {item.label}
                  </p>
                  <p className={`text-xl font-bold text-gray-900 mt-2 ${item.color || ''} capitalize`}>{item.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cycle Information Card */}
        {data.priority_order && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 backdrop-blur-sm bg-white/60 border border-white/50 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
          >
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              <span className="text-3xl">⚙</span>
              Cycle Information
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-white/80 to-orange-50/60 rounded-2xl p-5 border border-white/60">
                <p className="text-sm text-gray-700 mb-3 font-semibold">Priority Order</p>
                <div className="flex flex-wrap gap-3">
                  {data.priority_order.map((lane, idx) => (
                    <motion.span
                      key={idx}
                      whileHover={{ scale: 1.1, y: -2 }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-semibold rounded-xl text-sm capitalize shadow-lg hover:shadow-xl transition-all"
                    >
                      {lane}
                    </motion.span>
                  ))}
                </div>
              </div>
              {data.durations && (
                <div className="bg-gradient-to-r from-white/80 to-yellow-50/60 rounded-2xl p-5 border border-white/60">
                  <p className="text-sm text-gray-700 mb-3 font-semibold">Durations</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.priority_order.map((lane) => (
                      <motion.div
                        key={lane}
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="bg-white/80 border border-amber-200/50 rounded-xl p-4 text-center hover:border-amber-400/50 transition-all shadow-sm hover:shadow-md"
                      >
                        <p className="text-xs text-gray-700 capitalize font-bold">{lane}</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-1">
                          {data.durations[lane]}s
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Big Timer Display */}
        {currentPhase !== 'red' && remainingSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12 flex justify-center"
          >
            <div className="relative">
              {/* Animated background glow */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl blur-2xl opacity-50"
              />

              {/* Main timer card */}
              <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-3xl shadow-2xl p-12 border-4 border-white/40 backdrop-blur-sm">
                <motion.div
                  className="text-center"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-lg font-semibold text-white/90 mb-2 uppercase tracking-widest drop-shadow-lg"
                  >
                    {currentPhase === 'green' ? '🟢 Green Light' : '🟡 Yellow Light'}
                  </motion.div>
                  <motion.div
                    key={remainingSeconds}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-8xl md:text-9xl font-black text-white drop-shadow-2xl"
                  >
                    {remainingSeconds}
                  </motion.div>
                  <div className="text-xl font-semibold text-white/90 mt-4 capitalize drop-shadow-lg">{currentLane} Lane</div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Lane Cards Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {lanes.map((lane, idx) => (
            <motion.div
              key={lane}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
            >
              <LaneCard
                lane={lane}
                data={data}
                isActive={currentLane === lane && currentPhase !== 'red'}
                remaining={currentLane === lane ? remainingSeconds : undefined}
                waitTime={waitingTimes?.[lane] ?? 1}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default LaneDashboard;
