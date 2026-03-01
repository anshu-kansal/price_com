import React from 'react';
import OrderRow from './OrderRow';

const OrdersTable = ({ orders, selectedOrder, onSelectOrder }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                No orders found for this filter.
              </td>
            </tr>
          ) : (
            orders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onSelect={onSelectOrder}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;