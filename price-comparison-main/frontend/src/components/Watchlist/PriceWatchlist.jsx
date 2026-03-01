import React, { useEffect } from 'react';
import WatchlistTable from './WatchlistTable';
import { Filter, ChevronDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PriceWatchlist = () => {
  const { watchlist } = useAppContext();
  
  // Debug log
  useEffect(() => {
    console.log('Current watchlist in PriceWatchlist:', watchlist);
  }, [watchlist]);

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900">Price Watchlist</h3>
        <div className="flex items-center gap-4 text-sm">
          <button className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1">
            Sort by: Status
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
      <WatchlistTable />
    </div>
  );
};

export default PriceWatchlist;