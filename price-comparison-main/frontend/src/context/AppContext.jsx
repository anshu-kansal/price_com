import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Remove the unused setStats or use underscore prefix to indicate it's intentionally unused
  const [stats] = useState({  // Removed setStats since it's not used
    activeTrackers: 124,
    totalSavings: 2200.50,
    pendingAlerts: 8,
    expiredToday: 2
  });

  // Load data from localStorage on mount
  useEffect(() => {
    // Load watchlist
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      try {
        const parsed = JSON.parse(savedWatchlist);
        setWatchlist(parsed);
        console.log('✅ Loaded watchlist from localStorage:', parsed);
      } catch (e) {
        console.error('Error parsing watchlist:', e);
        setWatchlist([]);
      }
    }

    // Load cart
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCartItems(parsed);
        console.log('✅ Loaded cart from localStorage:', parsed);
      } catch (e) {
        console.error('Error parsing cart:', e);
        setCartItems([]);
      }
    }

    // Load orders
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        setOrders(parsed);
        console.log('✅ Loaded orders from localStorage:', parsed);
      } catch (e) {
        console.error('Error parsing orders:', e);
        setOrders([]);
      }
    }
    
    // Load initial data
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Simulate API calls for recommendations
    setRecommendations([
      {
        id: 1,
        name: 'Bose QC45',
        price: 279.00,
        originalPrice: 329.00,
        rating: 4.8,
        reviews: '2k',
        match: 98,
        icon: 'headphones'
      },
      {
        id: 2,
        name: 'Sennheiser M4',
        price: 299.95,
        rating: 4.6,
        reviews: 856,
        match: 92,
        badge: 'Best price',
        icon: 'smartphone'
      },
      {
        id: 3,
        name: 'AirPods Max',
        price: 479.00,
        rating: 4.7,
        reviews: '5k',
        badge: 'Price drop',
        tag: 'New',
        icon: 'video'
      }
    ]);
  };

  // Helper function to get store color based on store name
  const getStoreColor = (store) => {
    const storeColors = {
      'Best Buy': { bg: 'bg-blue-100', text: 'text-blue-700' },
      'Amazon': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'B&H Photo': { bg: 'bg-red-100', text: 'text-red-700' },
      'Walmart': { bg: 'bg-blue-600', text: 'text-white' }
    };
    return storeColors[store] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  // Helper function to format item with all required properties
  const formatOrderItem = (item) => {
    const storeColor = item.storeColor || getStoreColor(item.store || 'Unknown');
    const storeInitial = item.storeInitial || (item.store ? item.store.charAt(0).toUpperCase() : '?');
    
    return {
      id: item.id,
      name: item.name,
      store: item.store || 'Unknown',
      currentPrice: item.currentPrice || item.price || 0,
      originalPrice: item.originalPrice || null,
      quantity: item.quantity || 1,
      image: item.image || item.icon || 'monitor',
      storeColor: storeColor,
      storeInitial: storeInitial,
      status: item.status || 'Delivered',
      inStock: item.inStock !== undefined ? item.inStock : true,
      orderedAt: new Date().toISOString()
    };
  };

  // Watchlist functions
  const addToWatchlist = (item) => {
    console.log('➕ Adding to watchlist:', item);
    
    setWatchlist(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) {
        console.log('⚠️ Item already in watchlist');
        return prev;
      }
      
      const watchlistItem = {
        id: item.id,
        name: item.name,
        store: item.store || 'Unknown',
        currentPrice: item.currentPrice || item.price || 0,
        originalPrice: item.originalPrice || null,
        status: item.status === 'Low Stock' ? 'On Sale' : (item.status || 'Watching'),
        addedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        icon: item.icon || 'monitor',
        storeInitial: item.storeInitial || (item.store ? item.store.charAt(0).toUpperCase() : '?'),
        storeColor: item.storeColor || getStoreColor(item.store)
      };
      
      console.log('✅ Added to watchlist:', watchlistItem);
      return [...prev, watchlistItem];
    });
  };

  const removeFromWatchlist = (itemId) => {
    console.log('➖ Removing from watchlist:', itemId);
    setWatchlist(prev => {
      const newWatchlist = prev.filter(item => item.id !== itemId);
      console.log('✅ Removed, new watchlist:', newWatchlist);
      return newWatchlist;
    });
  };

  const isInWatchlist = (itemId) => {
    const inList = watchlist.some(item => item.id === itemId);
    return inList;
  };

  // Cart functions
  const addToCart = (item, quantity = 1) => {
    console.log('🛒 Adding to cart:', item, 'Quantity:', quantity);
    
    setCartItems(prev => {
      // Check if item already exists in cart
      const existingItem = prev.find(i => i.id === item.id);
      
      if (existingItem) {
        // Update quantity if already in cart
        const updatedCart = prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
        console.log('✅ Updated cart quantity:', updatedCart);
        return updatedCart;
      } else {
        // Add new item to cart
        const cartItem = {
          id: item.id,
          name: item.name,
          store: item.store || 'Unknown',
          currentPrice: item.currentPrice || item.price || 0,
          originalPrice: item.originalPrice || null,
          quantity: quantity,
          image: item.icon || 'monitor',
          storeColor: item.storeColor || getStoreColor(item.store),
          storeInitial: item.storeInitial || (item.store ? item.store.charAt(0).toUpperCase() : '?'),
          inStock: item.status !== 'Out of Stock',
          status: item.status,
          addedDate: new Date().toISOString()
        };
        
        console.log('✅ Added to cart:', cartItem);
        return [...prev, cartItem];
      }
    });
  };

  const removeFromCart = (itemId) => {
    console.log('➖ Removing from cart:', itemId);
    setCartItems(prev => {
      const newCart = prev.filter(item => item.id !== itemId);
      console.log('✅ Removed from cart, new cart:', newCart);
      return newCart;
    });
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
  };

  const getCartOriginalTotal = () => {
    return cartItems.reduce((sum, item) => sum + ((item.originalPrice || item.currentPrice) * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const isInCart = (itemId) => {
    return cartItems.some(item => item.id === itemId);
  };

  const getCartQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Order functions
  const createOrder = (items, paymentMethod = 'Credit Card') => {
    console.log('📦 Creating order for items:', items);
    
    const orderItems = items.length ? items : cartItems;
    
    if (orderItems.length === 0) {
      console.log('⚠️ No items to order');
      return null;
    }
    
    // Format each item with all required properties
    const formattedItems = orderItems.map(item => formatOrderItem(item));
    
    const orderTotal = formattedItems.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
    const orderOriginalTotal = formattedItems.reduce((sum, item) => sum + ((item.originalPrice || item.currentPrice) * item.quantity), 0);
    const orderSavings = orderOriginalTotal - orderTotal;
    
    const newOrder = {
      id: `#ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: formattedItems,
      total: orderTotal,
      originalTotal: orderOriginalTotal,
      savings: orderSavings,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      status: 'Active',
      paymentMethod: paymentMethod,
      tracking: `TRK${Math.floor(100000000 + Math.random() * 900000000)}`,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };
    
    setOrders(prev => [newOrder, ...prev]);
    
    // Remove ordered items from cart
    const orderedItemIds = orderItems.map(item => item.id);
    setCartItems(prev => prev.filter(item => !orderedItemIds.includes(item.id)));
    
    console.log('✅ Order created:', newOrder);
    return newOrder;
  };

  const buyNow = (item) => {
    console.log('⚡ Buy Now:', item);
    
    // Create order item with all required properties
    const orderItem = formatOrderItem({
      id: item.id,
      name: item.name,
      store: item.store || 'Unknown',
      currentPrice: item.currentPrice || item.price || 0,
      originalPrice: item.originalPrice || null,
      quantity: 1,
      image: item.icon || 'monitor',
      icon: item.icon,
      storeColor: item.storeColor,
      storeInitial: item.storeInitial,
      status: item.status || 'Delivered',
      inStock: item.status !== 'Out of Stock'
    });
    
    const orderTotal = orderItem.currentPrice;
    const orderOriginalTotal = orderItem.originalPrice || orderItem.currentPrice;
    const orderSavings = orderOriginalTotal - orderTotal;
    
    const newOrder = {
      id: `#ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [orderItem],
      total: orderTotal,
      originalTotal: orderOriginalTotal,
      savings: orderSavings,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      status: 'Active',
      paymentMethod: 'Credit Card',
      tracking: `TRK${Math.floor(100000000 + Math.random() * 900000000)}`,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };
    
    setOrders(prev => [newOrder, ...prev]);
    console.log('✅ Buy Now order created:', newOrder);
    return newOrder;
  };

  const getOrderById = (orderId) => {
    return orders.find(order => order.id === orderId);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order
      )
    );
  };

  const getTotalSpent = () => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  };

  const getTotalSaved = () => {
    return orders.reduce((sum, order) => sum + (order.savings || 0), 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Test function
  const addTestItem = () => {
    const testItem = {
      id: Date.now(),
      name: 'Test Product',
      store: 'Best Buy',
      currentPrice: 199.99,
      originalPrice: 249.99,
      status: 'On Sale',
      addedDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      storeInitial: 'B',
      storeColor: { bg: 'bg-blue-100', text: 'text-blue-700' }
    };
    setWatchlist(prev => [...prev, testItem]);
    console.log('🧪 Added test item:', testItem);
  };

  const value = {
    watchlist,
    cartItems,
    orders,
    alerts,
    recommendations,
    stats,
    searchQuery,
    setSearchQuery,
    clearSearch,
    // Watchlist functions
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    // Cart functions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartOriginalTotal,
    getCartItemCount,
    isInCart,
    getCartQuantity,
    // Order functions
    createOrder,
    buyNow,
    getOrderById,
    updateOrderStatus,
    getTotalSpent,
    getTotalSaved,
    // Other
    setAlerts,
    addTestItem
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};