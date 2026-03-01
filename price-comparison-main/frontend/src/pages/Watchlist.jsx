import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Eye, Trash2, ExternalLink, Clock, Store } from 'lucide-react';

const Watchlist = () => {
  const { watchlist, removeFromWatchlist } = useAppContext();

  // Format currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Calculate discount percentage
  const getDiscountPercentage = (current, original) => {
    if (!original || original <= current) return null;
    const discount = ((original - current) / original) * 100;
    return Math.round(discount);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'on sale':
        return 'bg-green-500/20 text-green-400';
      case 'low stock':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'watching':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Navigate to products page
  const goToProducts = () => {
    window.location.href = '/products';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Watchlist</h1>
          <p className="text-gray-400">
            {watchlist.length} {watchlist.length === 1 ? 'product' : 'products'} being tracked
          </p>
        </div>
        
        {/* Optional: Add filter/sort buttons */}
        {watchlist.length > 0 && (
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
              Sort by Price
            </button>
            <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
              Sort by Date
            </button>
          </div>
        )}
      </div>

      {/* Watchlist Items */}
      {watchlist.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Your watchlist is empty</h3>
          <p className="text-gray-400 mb-6">
            Start adding products to track price changes and get alerts
          </p>
          <button 
            onClick={goToProducts}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {watchlist.map((item) => (
            <div 
              key={item.id}
              className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800/80 transition-colors group"
            >
              <div className="flex items-start justify-between">
                {/* Product Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {/* Store Icon */}
                    <div className={`w-12 h-12 rounded-xl ${item.storeColor?.bg || 'bg-gray-800'} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xl font-bold ${item.storeColor?.text || 'text-gray-400'}`}>
                        {item.storeInitial || (item.store ? item.store.charAt(0).toUpperCase() : '?')}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-400">
                              <Store className="w-4 h-4" />
                              {item.store}
                            </span>
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock className="w-4 h-4" />
                              Added {item.addedDate || 'Recently'}
                            </span>
                          </div>
                        </div>

                        {/* Price and Actions */}
                        <div className="text-right">
                          <div className="mb-2">
                            <span className="text-2xl font-bold text-white">
                              {formatPrice(item.currentPrice)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.currentPrice && (
                              <>
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  {formatPrice(item.originalPrice)}
                                </span>
                                <span className="ml-2 text-xs font-semibold text-green-500">
                                  -{getDiscountPercentage(item.currentPrice, item.originalPrice)}%
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Status Badge */}
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                            {item.status || 'Watching'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
                        <button 
                          className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                          onClick={() => window.open(`/product/${item.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Details
                        </button>
                        <button 
                          className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors ml-auto"
                          onClick={() => removeFromWatchlist(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlist;