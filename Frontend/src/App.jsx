import React, { useRef, useState } from 'react';

function App() {
  // State: { [videoFile]: { frame, total } }
  const [videoData, setVideoData] = useState({});
  const [lights, setLights] = useState({});
  const [currentGreen, setCurrentGreen] = useState(null);
  const [lastGreenTime, setLastGreenTime] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [started, setStarted] = useState(false);
  const wsRef = useRef(null);

  // Lane mapping (must match backend)
  const laneMap = {
    '1.mp4': 'north',
    '2.mp4': 'south',
    '3.mp4': 'east',
    '4.mp4': 'west',
  };
  const videoFiles = ['1.mp4', '2.mp4', '3.mp4', '4.mp4'];

  const startDetection = () => {
    if (wsRef.current) return; // Prevent multiple connections
    setStarted(true);
    const ws = new WebSocket('ws://localhost:8000/ws/detect');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // If this is a light_status-only message, update lights only
      if (data.light_status) {
        setLights(data.light_status);
        return;
      }
      setVideoData(prev => ({
        ...prev,
        [data.video]: {
          frame: data.frame,
          total: data.total,
        }
      }));
      if (data.lights) setLights(data.lights);
      if (data.current_green) setCurrentGreen(data.current_green);
      if (data.last_green_time) setLastGreenTime(data.last_green_time);
      if (data.vehicle_counts) setVehicleCounts(data.vehicle_counts);
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
      wsRef.current = null;
    };
  };

  const handleManualChange = (lane) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'manual_change', lane }));
    }
  };

  // Clean up WebSocket on unmount
  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Helper for signal color
  const signalColor = (status) => {
    if (status === 'green') return 'bg-green-500';
    if (status === 'yellow') return 'bg-yellow-400';
    return 'bg-red-600';
  };

  // Helper for formatting time
  const formatTime = (t) => {
    if (!t) return '-';
    const d = new Date(t * 1000);
    return d.toLocaleTimeString();
  };

  // Helper for formatting last green time as relative
  const formatLastGreenAgo = (t) => {
    if (!t) return '-';
    const secondsAgo = Math.floor((Date.now() / 1000) - t);
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Traffic Detection Dashboard</h1>
      {!started && (
        <>
          <button
            onClick={startDetection}
            className="mb-6 px-6 py-2 bg-pink-600 text-white rounded shadow hover:bg-pink-700 transition"
          >
            Start Detection
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videoFiles.map((video) => (
              <div key={video} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col items-center w-[480px]">
                <div className="text-white text-lg mb-2">Video: <span className="font-mono">{video}</span></div>
                <video
                  src={`/Videos/${video}`}
                  autoPlay
                  loop
                  muted
                  className="w-[440px] h-auto rounded mb-4 border-2 border-gray-700"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ))}
          </div>
        </>
      )}
      {started && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {videoFiles.map((video) => {
            const data = videoData[video];
            const lane = laneMap[video];
            const light = lights[lane] || 'red';
            return (
              <div key={video} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col items-center w-[480px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-block w-5 h-5 rounded-full border-2 border-gray-700 ${signalColor(light)}`}></span>
                  <span className="text-white text-lg">Video: <span className="font-mono">{video}</span> <span className="ml-2 text-sm text-gray-400">({lane})</span></span>
                </div>
                <button
                  onClick={() => handleManualChange(lane)}
                  className="mb-2 px-4 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-sm"
                >
                  Change Manually
                </button>
                {data && data.frame ? (
                  <img
                    src={`data:image/jpeg;base64,${data.frame}`}
                    alt={`Detected Frame for ${video}`}
                    className="w-[440px] h-auto rounded mb-4 border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-[440px] h-[247px] flex items-center justify-center bg-gray-700 rounded mb-4 text-gray-400">
                    Waiting for video stream...
                  </div>
                )}
                <div className="flex flex-col gap-2 text-white text-lg mt-2 items-center">
                  <div>Total Vehicles: <span className="font-bold text-pink-400">{data?.total || 0}</span></div>
                  <div>Signal: <span className={`font-bold capitalize ${signalColor(light)}`}>{light}</span></div>
                  <div>Current Green: <span className="font-mono text-green-400">{currentGreen}</span></div>
                  <div>Last Green Time: <span className="font-mono text-yellow-300">{formatLastGreenAgo(lastGreenTime)}</span></div>
                  <div>All Vehicle Counts: <span className="font-mono text-blue-300">{vehicleCounts ? JSON.stringify(vehicleCounts) : '-'}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
