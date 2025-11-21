import React from 'react';

const LaneCard = ({ lane, data }) => {
  const { counts, frames, lights, remaining, phase, ages } = data;
  const count = counts ? counts[lane] : 0;
  const frame = frames ? frames[lane] : '';
  const light = lights ? lights[lane] : 'red';
  const age = ages ? ages[lane] : 0;

  const lightColor = light === 'green' ? 'bg-green-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-2 capitalize">{lane}</h3>
      <div className="flex items-center mb-2">
        <div className={`w-6 h-6 rounded-full ${lightColor} mr-2`}></div>
        <span className="text-lg">{phase === 'green' && data.lane === lane ? `${remaining}s` : ''}</span>
      </div>
      {frame && <img src={`data:image/jpeg;base64,${frame}`} alt={`${lane} lane`} className="rounded-md mb-2" />}
      <p>Vehicle Count: <span className="font-bold">{count}</span></p>
      <p>Age: <span className="font-bold">{age}</span></p>
    </div>
  );
};

export default LaneCard;
