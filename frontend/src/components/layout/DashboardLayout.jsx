// ============================================
// Student Dashboard Layout Wrapper
// Navbar, sidebar, and layout outlet
// ============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
//

