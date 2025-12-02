import React, { useRef, useEffect, useState } from 'react';

const PolygonOverlay = ({ imageSrc, polygon, onPolygonComplete, zones = [] }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [draggingPointIndex, setDraggingPointIndex] = useState(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if it's a video file
    const isVideo = imageSrc.endsWith('.mp4') || imageSrc.endsWith('.webm') || imageSrc.endsWith('.mov');
    
    if (isVideo) {
      // Handle video by capturing first frame
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      
      let seeked = false;
      
      video.onloadedmetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = 0.1;
        } else {
          // Video metadata loaded but dimensions are 0
          console.error('Video has zero dimensions:', imageSrc);
          setImageLoaded(false);
          const ctx = canvas.getContext('2d');
          canvas.width = 1920;
          canvas.height = 1080;
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#999';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Video has invalid dimensions', canvas.width / 2, canvas.height / 2);
        }
      };
      
      video.onseeked = () => {
        if (seeked) return; // Prevent multiple calls
        seeked = true;
        
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Video dimensions are zero');
          }
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Create an image from the canvas
          const img = new Image();
          img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
            draw();
          };
          img.onerror = () => {
            console.error('Failed to create image from video frame');
            setImageLoaded(false);
          };
          img.src = canvas.toDataURL();
        } catch (error) {
          console.error('Error capturing video frame:', error);
          setImageLoaded(false);
          const ctx = canvas.getContext('2d');
          if (canvas.width === 0) {
            canvas.width = 1920;
            canvas.height = 1080;
          }
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#999';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Video frame capture failed', canvas.width / 2, canvas.height / 2);
        }
      };
      
      video.onerror = (e) => {
        console.error('Failed to load video:', imageSrc, e);
        setImageLoaded(false);
        const ctx = canvas.getContext('2d');
        canvas.width = 1920;
        canvas.height = 1080;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Video failed to load. Using placeholder canvas.', canvas.width / 2, canvas.height / 2);
      };
      
      // Set video source and load
      video.src = imageSrc;
      video.load();
      
      // Timeout fallback - set canvas dimensions even if video fails
      setTimeout(() => {
        if (!imageLoaded && !seeked) {
          console.warn('Video loading timeout, using placeholder');
          const ctx = canvas.getContext('2d');
          if (canvas.width === 0) {
            canvas.width = 1920;
            canvas.height = 1080;
          }
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#999';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Video loading timeout. You can still draw zones on this canvas.', canvas.width / 2, canvas.height / 2);
          // Set a default image so drawing can still work
          const placeholderImg = new Image();
          placeholderImg.onload = () => {
            imageRef.current = placeholderImg;
            setImageLoaded(true);
          };
          // Create a blank image data URL
          const blankCanvas = document.createElement('canvas');
          blankCanvas.width = 1920;
          blankCanvas.height = 1080;
          const blankCtx = blankCanvas.getContext('2d');
          blankCtx.fillStyle = '#f0f0f0';
          blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
          placeholderImg.src = blankCanvas.toDataURL();
        }
      }, 5000);
    } else {
      // Handle image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          // Image is broken
          console.error('Image has zero dimensions:', imageSrc);
          setImageLoaded(false);
          const ctx = canvas.getContext('2d');
          canvas.width = 1920;
          canvas.height = 1080;
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#999';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Image failed to load', canvas.width / 2, canvas.height / 2);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        imageRef.current = img;
        setImageLoaded(true);
        draw();
      };
      
      img.onerror = (e) => {
        console.error('Failed to load image:', imageSrc, e);
        setImageLoaded(false);
        // Draw a placeholder if image fails to load
        const ctx = canvas.getContext('2d');
        canvas.width = 1920;
        canvas.height = 1080;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image failed to load: ' + imageSrc, canvas.width / 2, canvas.height / 2);
      };
      
      img.src = imageSrc;
    }
    
    // Cleanup function
    return () => {
      setImageLoaded(false);
      imageRef.current = null;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (imageLoaded) {
      draw();
    }
  }, [polygon, zones, currentPolygon, hoveredPointIndex, imageLoaded]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ensure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 1920;
      canvas.height = 1080;
    }

    // Draw image only if it's loaded and complete
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      try {
        ctx.drawImage(imageRef.current, 0, 0);
      } catch (error) {
        console.error('Error drawing image:', error);
        // Draw placeholder on error but allow drawing to continue
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error displaying image - you can still draw zones', canvas.width / 2, canvas.height / 2);
        // Don't return - allow drawing to continue
      }
    } else if (!imageLoaded) {
      // Draw placeholder if image not ready
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading image...', canvas.width / 2, canvas.height / 2);
      // Don't return - allow drawing to continue after loading
    } else {
      // No image but canvas is ready - draw blank background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Canvas ready - you can draw zones here', canvas.width / 2, canvas.height / 2);
    }

    // Draw existing zones
    zones.forEach((zone) => {
      if (zone.polygon && zone.polygon.length >= 3) {
        drawPolygon(ctx, zone.polygon, zone.illegalInside ? '#ef4444' : '#10b981', zone.type);
      }
    });

    // Draw current polygon being edited
    const polyToDraw = currentPolygon.length > 0 ? currentPolygon : polygon;
    if (polyToDraw.length >= 2) {
      drawPolygon(ctx, polyToDraw, '#f59e0b', 'Current', true);
    }
  };

  const drawPolygon = (ctx, points, color, label, isEditable = false) => {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color + '40';
    ctx.lineWidth = 2;

    // Draw polygon
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    if (points.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
      if (isEditable) {
        const isHovered = hoveredPointIndex === index;
        ctx.fillStyle = isHovered ? '#ffffff' : color;
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 3 : 2;
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
      }
      
      ctx.beginPath();
      ctx.arc(point[0], point[1], isEditable ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw label
    if (label && points.length > 0) {
      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.fillText(label, points[0][0] + 10, points[0][1] - 10);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    ];
  };

  const findPointAt = (x, y, threshold = 10) => {
    const polyToCheck = currentPolygon.length > 0 ? currentPolygon : polygon;
    for (let i = 0; i < polyToCheck.length; i++) {
      const [px, py] = polyToCheck[i];
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < threshold) return i;
    }
    return -1;
  };

  const handleMouseDown = (e) => {
    const [x, y] = getMousePos(e);
    const pointIndex = findPointAt(x, y);

    if (pointIndex >= 0) {
      // Start dragging existing point
      setDraggingPointIndex(pointIndex);
      setIsDrawing(false);
    } else {
      // Add new point
      const polyToUpdate = currentPolygon.length > 0 ? currentPolygon : polygon;
      const newPolygon = [...polyToUpdate, [x, y]];
      setCurrentPolygon(newPolygon);
      setIsDrawing(true);
      
      if (onPolygonComplete) {
        onPolygonComplete(newPolygon);
      }
    }
  };

  const handleMouseMove = (e) => {
    const [x, y] = getMousePos(e);
    
    if (draggingPointIndex !== null) {
      // Drag point
      const polyToUpdate = currentPolygon.length > 0 ? currentPolygon : polygon;
      const newPolygon = [...polyToUpdate];
      newPolygon[draggingPointIndex] = [x, y];
      setCurrentPolygon(newPolygon);
      
      if (onPolygonComplete) {
        onPolygonComplete(newPolygon);
      }
    } else {
      // Check hover
      const hoveredIndex = findPointAt(x, y);
      setHoveredPointIndex(hoveredIndex);
    }
  };

  const handleMouseUp = () => {
    setDraggingPointIndex(null);
    setIsDrawing(false);
  };

  const handleDoubleClick = (e) => {
    // Remove point on double click
    const [x, y] = getMousePos(e);
    const pointIndex = findPointAt(x, y);
    
    if (pointIndex >= 0) {
      const polyToUpdate = currentPolygon.length > 0 ? currentPolygon : polygon;
      const newPolygon = polyToUpdate.filter((_, i) => i !== pointIndex);
      setCurrentPolygon(newPolygon);
      
      if (onPolygonComplete) {
        onPolygonComplete(newPolygon);
      }
    }
  };

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-auto cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
        <p>Click to add points • Drag to move • Double-click to delete</p>
      </div>
    </div>
  );
};

export default PolygonOverlay;

