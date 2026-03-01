import React from 'react';
import { Music, Monitor, Smartphone } from 'lucide-react';

const iconMap = { 
  headphones: Music, 
  monitor: Monitor, 
  smartphone: Smartphone 
};

const statusStyles = {
  Delivered: 'bg-green-100 text-green-800',
  Active:    'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const OrderRow = ({ order, isSelected, onSelect }) => {
  // Get the first item from the order (since orders can have multiple items)
  const firstItem = order.items && order.items[0] ? order.items[0] : {};
  
  // Determine icon based on item image or default to Music
  const Icon = iconMap[firstItem.image] || Music;
  
  // Get store color with safe fallback
  const storeColor = firstItem.storeColor || { bg: 'bg-gray-100', text: 'text-gray-700' };
  
  // Get store name
  const storeName = firstItem.store || 'Unknown';
  
  // Get product name
  const productName = firstItem.name || 'Unknown Product';
  
  // Get price info
  const currentPrice = firstItem.currentPrice || 0;
  const originalPrice = firstItem.originalPrice || currentPrice;
  
  // Get item count for display
  const itemCount = order.items ? order.items.length : 1;

  return (
    <tr
      onClick={() => onSelect(order)}
      className={`group cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
      }`}
    >
      <td className="py-4 px-5">
        <span className="text-xs font-mono font-semibold text-gray-500">{order.id}</span>
      </td>
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors block">
              {productName}
            </span>
            {itemCount > 1 && (
              <span className="text-xs text-gray-500">+{itemCount - 1} more item(s)</span>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-5">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full ${storeColor.bg} ${storeColor.text} text-xs font-bold flex items-center justify-center`}>
            {storeName.charAt(0)}
          </span>
          <span className="text-sm text-gray-700">{storeName}</span>
        </div>
      </td>
      <td className="py-4 px-5">
        <p className="text-sm font-bold text-gray-900">${currentPrice.toFixed(2)}</p>
        {originalPrice > currentPrice && (
          <p className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</p>
        )}
      </td>
      <td className="py-4 px-5">
        <span className="text-sm text-gray-500">{order.date}</span>
      </td>
      <td className="py-4 px-5 text-right">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[order.status] || 'bg-gray-100 text-gray-800'}`}>
          {order.status}
        </span>
      </td>
    </tr>
  );
};

export default OrderRow;