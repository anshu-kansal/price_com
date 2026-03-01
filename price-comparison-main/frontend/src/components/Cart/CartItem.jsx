import React from 'react';
import { Minus, Plus, Trash2, Monitor, Music } from 'lucide-react';

const iconMap = {
  monitor: Monitor,
  headphones: Music,
};

const CartItem = ({ item, onQuantityChange, onRemove }) => {
  const Icon = iconMap[item.image] || Music;
  const savings = (item.originalPrice - item.currentPrice) * item.quantity;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5 hover:shadow-md transition-shadow">
      {/* Product Icon */}
      <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-9 h-9 text-gray-300" strokeWidth={1.2} />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.storeColor.bg} ${item.storeColor.text}`}>
                {item.store}
              </span>
              {!item.inStock && (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  Low Stock
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="text-gray-300 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Price & Quantity */}
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-lg font-bold text-gray-900">
              ${(item.currentPrice * item.quantity).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400 line-through ml-2">
              ${(item.originalPrice * item.quantity).toFixed(2)}
            </span>
            <span className="text-xs text-green-600 font-semibold ml-2">
              Save ${savings.toFixed(2)}
            </span>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onQuantityChange(item.id, -1)}
              className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus className="w-3 h-3 text-gray-600" />
            </button>
            <span className="w-6 text-center text-sm font-semibold text-gray-900">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.id, 1)}
              className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;








