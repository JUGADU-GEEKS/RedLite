import { useEffect, useRef, useState } from 'react';

function App() {
  // State: { [videoFile]: { frame, total } }
  const [videoData, setVideoData] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/detect');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setVideoData(prev => ({
        ...prev,
        [data.video]: {
          frame: data.frame,
          total: data.total,
        }
      }));
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    return () => {
      ws.close();
    };
  }, []);

  // List of expected video files (for consistent order)
  const videoFiles = ['1.mp4', '2.mp4', '3.mp4', '4.mp4'];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Traffic Detection Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {videoFiles.map((video) => {
          const data = videoData[video];
          return (
            <div key={video} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col items-center w-[480px]">
              <div className="text-white text-lg mb-2">Video: <span className="font-mono">{video}</span></div>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
