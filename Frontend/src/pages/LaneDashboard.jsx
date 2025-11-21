import React, { useState, useEffect } from 'react';
import LaneCard from '../components/LaneCard';
import { useAuth } from '../services/auth'; // Assuming you have an auth hook

const LaneDashboard = () => {
  const [data, setData] = useState({});
  const { token } = useAuth() || {}; // Get auth token, provide default empty object


  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/lane_feed`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // You could send the auth token here if needed
      // ws.send(JSON.stringify({ token }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
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
  }, [token]);

  const lanes = ['north', 'south', 'east', 'west'];

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-4">Lane Dashboard</h1>
      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-2xl mb-2">Cycle Information</h2>
        <p>Priority Order: <span className="font-mono">{data.priority_order?.join(' > ')}</span></p>
        <p>Durations: <span className="font-mono">{JSON.stringify(data.durations)}</span></p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lanes.map(lane => (
          <LaneCard key={lane} lane={lane} data={data} />
        ))}
      </div>
    </div>
  );
};

export default LaneDashboard;
