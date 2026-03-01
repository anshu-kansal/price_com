import React from 'react';
import { ShoppingBag, ChevronRight, Tag } from 'lucide-react';

const CartSummary = ({ subtotal, totalSavings, itemCount, onCheckout }) => {
  return (
    <div className="space-y-4 sticky top-0">
      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-5">Order Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className="font-medium text-green-600">Free</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Total Savings
            </span>
            <span>-${totalSavings.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 text-lg">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={onCheckout}
          className="w-full mt-6 bg-black text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Proceed to Checkout
          <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Secure checkout powered by Stripe
        </p>
      </div>

      {/* Savings Badge */}
      {totalSavings > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">
              You're saving ${totalSavings.toFixed(2)}!
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Best prices selected across all stores
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartSummary;