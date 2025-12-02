import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Camera } from 'lucide-react';

const VideoPlayer = ({ cameraId, onFrameCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState('/Videos/1.mp4');

  useEffect(() => {
    // Set video source based on camera
    const videoMap = {
      'CAM-001': '/Videos/1.mp4',
      'CAM-002': '/Videos/2.mp4',
      'CAM-003': '/Videos/3.mp4',
      'CAM-004': '/Videos/5.mp4',
    };
    setVideoSrc(videoMap[cameraId] || '/Videos/1.mp4');
  }, [cameraId]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      if (onFrameCapture) {
        onFrameCapture(imageData);
      }
      return imageData;
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg mb-4">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          loop
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="flex gap-4 justify-center">
        <button
          onClick={handlePlayPause}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={captureFrame}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Capture Frame
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;

