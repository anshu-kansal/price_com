import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import OrdersTable from '../components/Orders/OrdersTable';
import OrderDetail from '../components/Orders/OrderDetail';

const tabs = ['All', 'Active', 'Delivered', 'Cancelled'];

const Orders = () => {
  const { orders, getTotalSpent, getTotalSaved } = useAppContext();
  const [activeTab, setActiveTab] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders =
    activeTab === 'All'
      ? orders
      : orders.filter(o => o.status === activeTab);

  const totalSpent = getTotalSpent();
  const totalSaved = getTotalSaved();

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and manage all your purchases
          </p>
        </div>
        {orders.length > 0 && (
          <button 
            onClick={() => window.print()}
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
          >
            Export Orders
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Total Spent</p>
          <p className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm p-5">
          <p className="text-green-600 text-sm mb-1">Total Saved</p>
          <p className="text-3xl font-bold text-green-700">${totalSaved.toFixed(2)}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-500 text-sm">When you make a purchase, your orders will appear here</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab === 'All' ? orders.length : orders.filter(o => o.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          {/* Table + Detail Panel */}
          <div className={`grid gap-6 ${selectedOrder ? 'grid-cols-5' : 'grid-cols-1'}`}>
            <div className={selectedOrder ? 'col-span-3' : 'col-span-1'}>
              <OrdersTable
                orders={filteredOrders}
                selectedOrder={selectedOrder}
                onSelectOrder={setSelectedOrder}
              />
            </div>

            {selectedOrder && (
              <div className="col-span-2">
                <OrderDetail
                  order={selectedOrder}
                  onClose={() => setSelectedOrder(null)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Orders;