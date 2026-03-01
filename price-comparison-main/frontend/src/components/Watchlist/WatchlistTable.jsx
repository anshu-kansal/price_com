import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Monitor, Smartphone, Camera } from 'lucide-react';

const iconMap = {
  monitor: Monitor,
  smartphone: Smartphone,
  camera: Camera,
};

const statusColors = {
  'On Sale': 'bg-green-100 text-green-800',
  'Watching': 'bg-gray-100 text-gray-800',
  'Price Stable': 'bg-blue-100 text-blue-800',
};

const storeColors = {
  'Best Buy': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Amazon': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'B&H Photo': { bg: 'bg-red-100', text: 'text-red-700' },
};

const WatchlistTable = () => {
  const { watchlist } = useAppContext();
  
  // Debug log
  useEffect(() => {
    console.log('WatchlistTable received:', watchlist);
  }, [watchlist]);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[40%]">
              Product
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Store
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Current Price
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {watchlist && watchlist.length > 0 ? (
            watchlist.map((item) => {
              const Icon = iconMap[item.icon] || Monitor;
              const storeColor = storeColors[item.store] || item.storeColor || { bg: 'bg-gray-100', text: 'text-gray-700' };
              
              return (
                <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">Added {item.addedDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${storeColor.bg} flex items-center justify-center ${storeColor.text} text-xs font-bold`}>
                        {item.storeInitial || item.store?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm text-gray-700">{item.store}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-gray-900">
                      ${item.currentPrice?.toFixed(2) || '0.00'}
                    </p>
                    {item.originalPrice && (
                      <p className="text-xs text-gray-400 line-through">
                        ${item.originalPrice.toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
                      {item.status || 'Watching'}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="py-8 text-center text-gray-500">
                No items in watchlist
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WatchlistTable;