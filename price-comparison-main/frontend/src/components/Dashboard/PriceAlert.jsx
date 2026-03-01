import React from 'react';

const PriceAlert = () => {
  return (
    <div className="w-full bg-[#16A34A] rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-green-500/20">
      <div>
        <h2 className="font-bold text-lg mb-1">Price Alert Triggered</h2>
        <p className="text-green-50">
          Sony WH-1000XM5 dropped below your target price of $300 at Walmart.
        </p>
      </div>
      <button className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-6 rounded-lg transition-colors backdrop-blur-sm">
        View Deal
      </button>
    </div>
  );
};

export default PriceAlert;