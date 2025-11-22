import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LaneCard from '../components/LaneCard';
import { useAuth } from '../services/auth';
import Navbar from '../components/Navbar';

const LaneDashboard = () => {
  const { intersectionId } = useParams();
  const [data, setData] = useState({});
  const [signalStatus, setSignalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth() || {};

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  // Fetch signal status on mount
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
          // Try with hyphenated version if original fails
          const normalizedId = intersectionId.replace(/(\d+)/, '-$1').replace(/^-/, '');
          if (normalizedId !== intersectionId) {
            try {
              const retryResponse = await fetch(`${API_BASE}/signal_status/${normalizedId}`);
              if (retryResponse.ok) {
                const status = await retryResponse.json();
                setSignalStatus(status);
              }
            } catch (e) {
              console.error('Error fetching signal status:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching signal status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignalStatus();
  }, [intersectionId, API_BASE]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/lane_feed`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
      // Update signal status from websocket data if available
      if (message.lights && message.phase) {
        setSignalStatus({
          state: message.lights,
          currentLane: message.lane,
          remainingTime: message.remaining,
          phase: message.phase
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
  }, [token]);

  const lanes = ['north', 'south', 'east', 'west'];
  const currentLane = data.lane;
  const remainingSeconds = data.remaining || 0;
  const currentPhase = data.phase || 'red';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Traffic Lane Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {intersectionId ? `Intersection: ${intersectionId}` : 'Real-time traffic monitoring'}
          </p>
        </div>

        {/* Signal Status Information */}
        {signalStatus && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl shadow-sm border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Signal Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current Lane: </span>
                <span className="font-semibold text-gray-900 capitalize">
                  {signalStatus.currentLane || 'None'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Phase: </span>
                <span className={`font-semibold ${
                  signalStatus.phase === 'green' ? 'text-green-600' :
                  signalStatus.phase === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {signalStatus.phase?.toUpperCase() || 'RED'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Remaining: </span>
                <span className="font-semibold text-gray-900">
                  {signalStatus.remainingTime || 0}s
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status: </span>
                <span className="font-semibold text-green-600">
                  {signalStatus.state ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cycle Information */}
        {data.priority_order && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cycle Information</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-500">Priority Order: </span>
                <span className="font-mono font-medium text-gray-900">
                  {data.priority_order.join(' → ')}
                </span>
              </div>
              {data.durations && (
                <div>
                  <span className="text-gray-500">Durations: </span>
                  <span className="font-mono font-medium text-gray-900">
                    {data.priority_order.map(lane => `${lane}: ${data.durations[lane]}s`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BIG TIMER DISPLAY - Center of screen */}
        {currentPhase !== 'red' && remainingSeconds > 0 && (
          <div className="mb-8 flex justify-center">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl p-8 border-4 border-white">
              <div className="text-center">
                <div className="text-sm font-medium text-white/90 mb-2 uppercase tracking-wider">
                  {currentPhase === 'green' ? '🟢 Green Light' : '🟡 Yellow Light'}
                </div>
                <div className="text-8xl md:text-9xl font-bold text-white drop-shadow-lg">
                  {remainingSeconds}
                </div>
                <div className="text-lg font-medium text-white/90 mt-2 capitalize">
                  {currentLane} Lane
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {lanes.map(lane => (
            <LaneCard 
              key={lane} 
              lane={lane} 
              data={data}
              isActive={currentLane === lane && currentPhase !== 'red'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LaneDashboard;
