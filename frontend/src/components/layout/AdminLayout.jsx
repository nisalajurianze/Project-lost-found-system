// ============================================
// Admin Panel Layout Wrapper
// Navbar, Admin sidebar, and layout Outlet
// ============================================

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiList,
  FiCheckCircle,
  FiShield,
  FiMessageSquare,
  FiArrowLeft
} from 'react-icons/fi';

export const AdminLayout = () => {
  const adminLinks = [
    { label: 'Admin Dashboard', path: '/admin', icon: <FiGrid />, end: true },
    { label: 'Manage Users', path: '/admin/users', icon: <FiUsers /> },
    { label: 'Manage Lost Reports', path: '/admin/lost-items', icon: <FiFileText /> },
    { label: 'Manage Found Listings', path: '/admin/found-items', icon: <FiFileText /> },
    { label: 'Manage Categories', path: '/admin/categories', icon: <FiList /> },
    { label: 'Users Feedback', path: '/admin/feedback', icon: <FiMessageSquare /> },
    { label: 'Admin Audit Logs', path: '/admin/logs', icon: <FiShield /> },
    { label: 'Student Panel', path: '/dashboard', icon: <FiArrowLeft />, borderTop: true }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        
        {/* Admin Left Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-surface-200/50 bg-white/40 dark:border-surface-800/50 dark:bg-surface-950/40 backdrop-blur-xl p-5 hidden lg:flex flex-col no-print">
          <div className="mb-4 px-4 py-2 bg-primary-500/10 rounded-xl">
            <span className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wider block">
              System Admin Panel
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            {adminLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${
                    link.borderTop ? 'mt-4 pt-4 border-t border-surface-200 dark:border-surface-700/50' : ''
                  }`
                }
              >
                <span className="text-[1.15rem] opacity-90">{link.icon}</span>
                <span className="font-semibold tracking-wide">{link.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
// 

