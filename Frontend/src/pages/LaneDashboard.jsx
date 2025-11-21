import React, { useState, useEffect, useRef } from 'react';
import LaneCard from '../components/LaneCard';

const LaneDashboard = () => {
  const [connected, setConnected] = useState(false);
  const [trafficState, setTrafficState] = useState(null);
  const wsRef = useRef(null);
  const intersectionId = "INT-001"; // Default or from params

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = `ws://localhost:8000/ws/lane_feed?intersectionId=${intersectionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Lane Feed');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTrafficState(data);
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Lane Feed');
      setConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [intersectionId]);

  if (!trafficState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">
          {connected ? 'Waiting for traffic data...' : 'Connecting to Traffic System...'}
        </div>
      </div>
    );
  }

  const { 
    phase, 
    lane: activeLane, 
    remaining, 
    counts, 
    frames, 
    priority_order, 
    durations, 
    ages,
    lights 
  } = trafficState;

  const lanes = ['north', 'south', 'east', 'west'];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Smart Traffic Control (PRR-MASC)</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {connected ? 'System Online' : 'Disconnected'}
          </span>
          <span>Intersection: {intersectionId}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {lanes.map(lane => {
          const isActive = lights && (lights[lane] === 'green' || lights[lane] === 'yellow');
          const isYellow = lights && lights[lane] === 'yellow';
          
          return (
            <LaneCard 
              key={lane}
              lane={lane}
              isActive={isActive}
              isYellow={isYellow}
              data={{
                count: counts ? counts[lane] : 0,
                frame: frames ? frames[lane] : null,
                remaining: isActive ? remaining : 0,
                age: ages ? ages[lane] : 0
              }}
            />
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Cycle Plan Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-600 mb-2">Priority Order (Calculated at Cycle Start)</h3>
            <div className="flex space-x-2">
              {priority_order && priority_order.map((lane, idx) => (
                <div key={lane} className="flex items-center">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    {idx + 1}. {lane.toUpperCase()}
                  </div>
                  {idx < priority_order.length - 1 && (
                    <span className="mx-2 text-gray-400">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600 mb-2">Assigned Durations</h3>
            <div className="grid grid-cols-4 gap-4">
              {durations && Object.entries(durations).map(([lane, dur]) => (
                <div key={lane} className="bg-gray-50 p-2 rounded border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 uppercase">{lane}</div>
                  <div className="font-bold text-gray-800">{dur}s</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaneDashboard;
