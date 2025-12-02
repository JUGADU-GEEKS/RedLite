import React, { useRef, useEffect, useState } from 'react';

const BoundaryLineOverlay = ({ imageSrc, points, onLineComplete, lines = [] }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
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
      
      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };
      
      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Create an image from the canvas
          const img = new Image();
          img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
            draw();
          };
          img.src = canvas.toDataURL();
        } catch (error) {
          console.error('Error capturing video frame:', error);
          setImageLoaded(false);
          const ctx = canvas.getContext('2d');
          canvas.width = 1920;
          canvas.height = 1080;
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#999';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Video frame capture failed', canvas.width / 2, canvas.height / 2);
        }
      };
      
      video.onerror = () => {
        console.error('Failed to load video:', imageSrc);
        setImageLoaded(false);
        const ctx = canvas.getContext('2d');
        canvas.width = 1920;
        canvas.height = 1080;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Video failed to load', canvas.width / 2, canvas.height / 2);
      };
      
      video.src = imageSrc;
      video.load();
    } else {
      // Handle image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        imageRef.current = img;
        setImageLoaded(true);
        draw();
      };
      
      img.onerror = (e) => {
        console.error('Failed to load image:', imageSrc, e);
        setImageLoaded(false);
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
  }, [points, lines, currentPoints, hoveredIndex, imageLoaded]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image only if it's loaded and complete and not broken
    if (imageRef.current && 
        imageRef.current.complete && 
        imageRef.current.naturalWidth > 0 && 
        imageRef.current.naturalHeight > 0 &&
        !imageRef.current.error) {
      try {
        ctx.drawImage(imageRef.current, 0, 0);
      } catch (error) {
        console.error('Error drawing image:', error);
        // Draw placeholder on error
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error displaying image', canvas.width / 2, canvas.height / 2);
        return;
      }
    } else if (!imageLoaded) {
      // Draw placeholder if image not ready
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading image...', canvas.width / 2, canvas.height / 2);
      return;
    } else {
      // Image failed to load
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Image not available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw existing lines
    lines.forEach((line) => {
      if (line.points && line.points.length === 2) {
        drawLine(ctx, line.points, line.illegalSide, line.lineName || 'Line');
      }
    });

    // Draw current line being edited
    const lineToDraw = currentPoints.length > 0 ? currentPoints : points;
    if (lineToDraw.length >= 2) {
      drawLine(ctx, lineToDraw, 'LEFT', 'Current', true);
    }
  };

  const drawLine = (ctx, linePoints, illegalSide, label, isEditable = false) => {
    if (linePoints.length !== 2) return;

    const [p1, p2] = linePoints;
    const color = isEditable ? '#f59e0b' : '#ef4444';

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();

    // Draw arrow indicating illegal side
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const angle = Math.atan2(dy, dx);
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;

    // Perpendicular vector for arrow
    const perpAngle = angle + Math.PI / 2;
    const arrowLength = 30;
    const arrowX = midX + Math.cos(perpAngle) * arrowLength;
    const arrowY = midY + Math.sin(perpAngle) * arrowLength;

    // Draw arrow based on illegal side
    if (illegalSide === 'LEFT' || illegalSide === 'BOTH') {
      drawArrow(ctx, midX, midY, arrowX, arrowY, color);
    }
    if (illegalSide === 'RIGHT' || illegalSide === 'BOTH') {
      const arrowX2 = midX - Math.cos(perpAngle) * arrowLength;
      const arrowY2 = midY - Math.sin(perpAngle) * arrowLength;
      drawArrow(ctx, midX, midY, arrowX2, arrowY2, color);
    }

    // Draw endpoints
    linePoints.forEach((point, index) => {
      if (isEditable) {
        const isHovered = hoveredIndex === index;
        ctx.fillStyle = isHovered ? '#ffffff' : color;
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 3 : 2;
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
      }
      
      ctx.beginPath();
      ctx.arc(point[0], point[1], isEditable ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw label
    if (label) {
      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.fillText(label, midX + 10, midY - 10);
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();
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

  const findPointAt = (x, y, threshold = 15) => {
    const pointsToCheck = currentPoints.length > 0 ? currentPoints : points;
    for (let i = 0; i < pointsToCheck.length; i++) {
      const [px, py] = pointsToCheck[i];
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < threshold) return i;
    }
    return -1;
  };

  const handleMouseDown = (e) => {
    const [x, y] = getMousePos(e);
    const pointIndex = findPointAt(x, y);

    if (pointIndex >= 0) {
      setDraggingIndex(pointIndex);
    } else {
      const pointsToUpdate = currentPoints.length > 0 ? currentPoints : points;
      if (pointsToUpdate.length < 2) {
        const newPoints = [...pointsToUpdate, [x, y]];
        setCurrentPoints(newPoints);
        
        if (newPoints.length === 2 && onLineComplete) {
          onLineComplete(newPoints);
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    const [x, y] = getMousePos(e);
    
    if (draggingIndex !== null) {
      const pointsToUpdate = currentPoints.length > 0 ? currentPoints : points;
      const newPoints = [...pointsToUpdate];
      newPoints[draggingIndex] = [x, y];
      setCurrentPoints(newPoints);
      
      if (onLineComplete) {
        onLineComplete(newPoints);
      }
    } else {
      const hovered = findPointAt(x, y);
      setHoveredIndex(hovered);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-auto cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
        <p>Click to place 2 points • Drag to move endpoints</p>
      </div>
    </div>
  );
};

export default BoundaryLineOverlay;

