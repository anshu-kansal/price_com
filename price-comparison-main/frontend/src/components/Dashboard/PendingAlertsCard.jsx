import React from 'react';
import { useAppContext } from '../../context/AppContext';

const PendingAlertsCard = () => {
  const { stats } = useAppContext();

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-56">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-4">Pending Alerts</p>
        <h3 className="text-5xl font-bold text-gray-900">{stats.pendingAlerts}</h3>
      </div>
      <div>
        <p className="text-red-500 text-sm font-medium bg-red-50 py-1 px-3 rounded-full w-max">
          {stats.expiredToday} expired today
        </p>
      </div>
    </div>
  );
};
export default PendingAlertsCard;