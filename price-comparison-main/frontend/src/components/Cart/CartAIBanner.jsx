import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';

const CartAIBanner = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-indigo-500/20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">AI Suggestion</p>
          <p className="text-indigo-100 text-xs mt-0.5">
            Switch Bose QC45 to Walmart — save an extra $12.00 on your order.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button className="bg-white text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
          Apply
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CartAIBanner;