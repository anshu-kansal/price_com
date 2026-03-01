import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="bg-[#F3F4F6] text-gray-900 h-screen w-screen overflow-hidden flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;