import React from 'react';

const LaneCard = ({ lane, data, isActive, isYellow }) => {
  const { count, frame, remaining, age } = data || {};
  
  // Determine border color based on state
  let borderColor = 'border-gray-300';
  let statusColor = 'bg-red-500';
  let statusText = 'RED';
  
  if (isActive) {
    if (isYellow) {
      borderColor = 'border-yellow-400';
      statusColor = 'bg-yellow-400';
      statusText = 'YELLOW';
    } else {
      borderColor = 'border-green-500';
      statusColor = 'bg-green-500';
      statusText = 'GREEN';
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-4 ${borderColor} transition-all duration-300`}>
      <div className="relative h-48 bg-gray-200">
        {frame ? (
          <img 
            src={frame} 
            alt={`${lane} view`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No Feed
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm font-bold">
          {lane.toUpperCase()}
        </div>
        <div className={`absolute top-2 left-2 ${statusColor} text-white px-3 py-1 rounded text-sm font-bold shadow-sm`}>
          {statusText} {isActive && remaining !== undefined ? `(${remaining}s)` : ''}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 font-medium">Vehicle Count:</span>
          <span className="text-2xl font-bold text-gray-800">{count || 0}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Wait Score (Age):</span>
          <span className="font-mono text-gray-700">{age || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default LaneCard;
