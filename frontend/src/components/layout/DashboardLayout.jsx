// ============================================
// Student Dashboard Layout Wrapper
// Navbar, sidebar, and layout outlet
// ============================================

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import {
  FiGrid,
  FiPlusCircle,
  FiFileText,
  FiActivity,
  FiCheckSquare,
  FiUser,
  FiPackage
} from 'react-icons/fi';

export const DashboardLayout = () => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
// 

