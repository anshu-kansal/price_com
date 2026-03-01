import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { TrendingUp } from 'lucide-react';

const ActiveTrackersCard = () => {
  const { stats } = useAppContext();

  return (
    <div className="bg-black text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between h-56 relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-gray-400 text-sm font-medium mb-4">Active Trackers</p>
        <h3 className="text-5xl font-bold mb-2">{stats.activeTrackers}</h3>
        <p className="text-green-400 text-sm font-medium flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          +12 this week
        </p>
      </div>
      <div className="flex items-end gap-2 h-16 mt-4 relative z-10">
        {[8, 12, 6, 10, 14, 10].map((height, index) => (
          <div
            key={index}
            className={`w-2 rounded-t transition-all duration-300 ${
              index === 5 ? 'bg-green-500' : index >= 3 ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            style={{ 
              height: `${height * 4}px`,
              transitionDelay: `${index * 75}ms`
            }}
          />
        ))}
      </div>
      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-gray-800/20 rounded-full blur-2xl"></div>
    </div>
  );
};

export default ActiveTrackersCard;