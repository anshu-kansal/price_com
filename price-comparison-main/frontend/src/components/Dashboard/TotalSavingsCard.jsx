import React from 'react';
import { useAppContext } from '../../context/AppContext';

const TotalSavingsCard = () => {
  const { stats } = useAppContext();
  const dollars = Math.floor(stats.totalSavings);
  const cents = (stats.totalSavings % 1).toFixed(2).slice(2);

  return (
    <div className="bg-gray-200 p-6 rounded-2xl flex flex-col justify-between h-56">
      <div>
        <p className="text-gray-600 text-sm font-medium mb-4">Total Savings</p>
        <div className="flex items-baseline">
          <h3 className="text-4xl font-bold text-gray-900">${dollars.toLocaleString()}</h3>
          <span className="text-gray-600 text-xl font-semibold">.{cents}</span>
        </div>
        <p className="text-gray-500 text-sm mt-1">Across 18 purchases</p>
      </div>
      <button className="bg-black text-white font-medium py-2.5 px-6 rounded-full w-max text-sm hover:bg-gray-800 transition-colors">
        View History
      </button>
    </div>
  );
};

export default TotalSavingsCard;