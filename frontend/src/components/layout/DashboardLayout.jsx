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
  
  // Mobile bottom navigation bar links
  const mobileNavLinks = [
    { label: 'Overview', path: '/dashboard', icon: <FiGrid /> },
    { label: 'Lost', path: '/dashboard/report-lost', icon: <FiPlusCircle /> },
    { label: 'Found', path: '/dashboard/report-found', icon: <FiPackage /> },
    { label: 'Matches', path: '/dashboard/my-matches', icon: <FiActivity /> },
    { label: 'Profile', path: '/dashboard/profile', icon: <FiUser /> }
  ];

  const isMobileActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-surface-950/85 backdrop-blur-lg border-t border-surface-200/50 dark:border-surface-800/50 px-4 py-2 flex justify-around no-print">
        {mobileNavLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              isMobileActive(link.path)
                ? 'text-primary-500 dark:text-primary-400'
                : 'text-surface-500 dark:text-surface-400'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardLayout;
// 
