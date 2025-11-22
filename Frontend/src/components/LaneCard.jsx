import React from 'react';

const LaneCard = ({ lane, data, isActive = false }) => {
  const { counts, frames, lights, remaining, phase, ages, priority_order, durations } = data;
  const count = counts ? counts[lane] : 0;
  const frame = frames ? frames[lane] : '';
  const light = lights ? lights[lane] : 'red';
  const age = ages ? ages[lane] : 0;
  const rank = priority_order ? priority_order.indexOf(lane) + 1 : null;
  const duration = durations ? durations[lane] : null;

  const lightColor = light === 'green' ? 'bg-green-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
  const lightGlow = light === 'green' ? 'shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 
                     light === 'yellow' ? 'shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 
                     'shadow-none';

  // Highlight active lane
  const borderClass = isActive 
    ? 'border-4 border-amber-500 shadow-xl scale-105' 
    : 'border-2 border-gray-200';

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 transition-all duration-300 ${borderClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900 capitalize">{lane}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${lightColor} ${lightGlow} transition-all`}></div>
          {rank && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
              Rank {rank}
            </span>
          )}
        </div>
      </div>

      {/* Frame Preview */}
      {frame ? (
        <div className="mb-3 rounded-lg overflow-hidden border-2 border-gray-100">
          <img 
            src={`data:image/jpeg;base64,${frame}`} 
            alt={`${lane} lane`} 
            className="w-full h-32 object-cover"
          />
        </div>
      ) : (
        <div className="mb-3 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">No frame</span>
        </div>
      )}

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Vehicle Count:</span>
          <span className="font-bold text-gray-900">{count}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Age:</span>
          <span className={`font-bold ${age > 60 ? 'text-red-600' : 'text-gray-900'}`}>
            {age}s
          </span>
        </div>
        {duration && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Green Duration:</span>
            <span className="font-bold text-gray-900">{duration}s</span>
          </div>
        )}
        {isActive && phase && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                phase === 'green' ? 'bg-green-100 text-green-700' :
                phase === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {phase.toUpperCase()}
              </span>
            </div>
            {remaining !== undefined && (
              <div className="mt-2 text-center">
                <span className="text-2xl font-bold text-amber-600">{remaining}s</span>
                <span className="text-xs text-gray-500 ml-1">remaining</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaneCard;
