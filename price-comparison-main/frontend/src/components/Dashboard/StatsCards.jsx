import React from 'react';
import { useAppContext } from '../../context/AppContext';
import ActiveTrackersCard from './ActiveTrackersCard';
import TotalSavingsCard from './TotalSavingsCard';
import PendingAlertsCard from './PendingAlertsCard';

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ActiveTrackersCard />
      <TotalSavingsCard />
      <PendingAlertsCard />
    </div>
  );
};

export default StatsCards;