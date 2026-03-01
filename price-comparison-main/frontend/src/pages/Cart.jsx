import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import CartItem from '../components/Cart/CartItem';
import CartSummary from '../components/Cart/CartSummary';
import CartAIBanner from '../components/Cart/CartAIBanner';

const Cart = () => {
  const { 
    cartItems, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    getCartTotal,
    getCartOriginalTotal,
    getCartItemCount,
    createOrder
  } = useAppContext();
  
  const navigate = useNavigate();

  const handleQuantityChange = (id, delta) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      updateCartQuantity(id, item.quantity + delta);
    }
  };

  const handleRemove = (id) => {
    removeFromCart(id);
  };

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      const order = createOrder(cartItems);
      if (order) {
        navigate('/orders');
      }
    }
  };

  const subtotal = getCartTotal();
  const originalTotal = getCartOriginalTotal();
  const totalSavings = originalTotal - subtotal;
  const itemCount = getCartItemCount();

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-gray-500 text-sm mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} — all at their best tracked price
          </p>
        </div>
        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* AI Suggestion Banner */}
      <CartAIBanner />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Your cart is empty</h3>
              <p className="text-gray-500 text-sm">Add products from your watchlist or recommendations</p>
              <button
                onClick={() => navigate('/products')}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <div className="lg:col-span-1">
            <CartSummary
              subtotal={subtotal}
              totalSavings={totalSavings}
              itemCount={itemCount}
              onCheckout={handleCheckout}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;