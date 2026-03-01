
import React from 'react';
import { X, Package, Zap, Music, Monitor, Smartphone } from 'lucide-react';

const iconMap = { headphones: Music, monitor: Monitor, smartphone: Smartphone };

const statusStyles = {
  Delivered: 'bg-green-100 text-green-800',
  Active:    'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const OrderDetail = ({ order, onClose }) => {
  const Icon = iconMap[order.icon] || Music;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 sticky top-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Order Detail</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Product */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-14 h-14 bg-white rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{order.product}</p>
          <p className="text-xs text-gray-500 mt-0.5">{order.id}</p>
          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[order.status]}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Price Breakdown
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Original Price</span>
            <span className="line-through">${order.originalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium">
            <span>PriceMonitor Savings</span>
            <span>-${order.savings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
            <span>Paid</span>
            <span>${order.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tracking Info
        </h4>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tracking Number</p>
            <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5">{order.tracking}</p>
          </div>
        </div>

        {/* Timeline */}
        {order.status !== 'Cancelled' && (
          <div className="mt-4 space-y-3">
            {['Order Placed', 'Processing', 'Shipped', ...(order.status === 'Delivered' ? ['Delivered'] : [])].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    i === arr.length - 1 ? 'bg-green-500' : 'bg-black'
                  }`} />
                  <p className={`text-xs font-medium ${
                    i === arr.length - 1 ? 'text-green-600' : 'text-gray-900'
                  }`}>{step}</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <p className="text-xs font-semibold text-indigo-700">AI Savings Summary</p>
        </div>
        <p className="text-xs text-indigo-600 leading-relaxed">
          PriceMonitor found the best deal for {order.product} at {order.store}, saving you{' '}
          <span className="font-bold">${order.savings.toFixed(2)}</span> compared to the average market price.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
          Reorder
        </button>
        <button className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          Get Support
        </button>
      </div>
    </div>
  );
};

export default OrderDetail;