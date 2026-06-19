// ============================================
// Admin Panel Layout Wrapper
// Navbar, Admin sidebar, and layout Outlet
// ============================================

import React, { useState } from 'react';
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
  FiArrowLeft,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';

export const AdminLayout = () => {
  const dispatch = useDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const adminLinks = [
    { label: 'Admin Dashboard', path: '/admin', icon: <FiGrid />, end: true },
    { label: 'Manage Users', path: '/admin/users', icon: <FiUsers /> },
    { label: 'Manage Lost Reports', path: '/admin/lost-items', icon: <FiFileText /> },
    { label: 'Manage Found Listings', path: '/admin/found-items', icon: <FiFileText /> },
    { label: 'Manage Categories', path: '/admin/categories', icon: <FiList /> },
    { label: 'Users Feedback', path: '/admin/feedback', icon: <FiMessageSquare /> },
    { label: 'Admin Audit Logs', path: '/admin/logs', icon: <FiShield /> },
    { label: 'Site Settings', path: '/admin/settings', icon: <FiSettings /> },
    { label: 'Student Panel', path: '/dashboard', icon: <FiArrowLeft />, borderTop: true }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar 
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        isMenuOpen={isMobileMenuOpen} 
      />
      <div className="flex-1 flex flex-col lg:flex-row w-full relative">
        
        {/* Mobile Dropdown Menu (Overlay) */}
        <div className={`lg:hidden absolute left-0 right-0 z-10 bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl border-b border-surface-200 dark:border-surface-700/50 shadow-xl transition-all duration-300 origin-top overflow-hidden ${isMobileMenuOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col p-4 gap-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {adminLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `${isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/30'} flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    link.borderTop ? 'mt-3 pt-3 border-t border-surface-200 dark:border-surface-700/50 rounded-none border-transparent' : ''
                  }`
                }
              >
                <span className="text-[1.25rem] opacity-90">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </NavLink>
            ))}
            <div className="mt-2 pt-2 border-t border-surface-200/50 dark:border-surface-800/50">
              <button
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                <span className="text-[1.15rem] opacity-90"><FiLogOut /></span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Admin Left Sidebar */}
        <aside className="w-[280px] flex-shrink-0 border-r border-surface-200/50 bg-white/40 dark:border-surface-800/50 dark:bg-surface-950/40 backdrop-blur-xl p-5 hidden lg:flex flex-col no-print sticky top-16 h-[calc(100vh-4rem)]">
          <div className="mb-6 px-4 py-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest block text-center">
              System Admin Panel
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
            {adminLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${
                    link.borderTop ? 'mt-4 pt-4 border-t border-surface-200 dark:border-surface-700/50 rounded-none border-transparent' : ''
                  }`
                }
              >
                <span className="text-[1.25rem] opacity-90">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </NavLink>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-surface-200/50 dark:border-surface-800/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <span className="text-[1.15rem] opacity-90"><FiLogOut /></span>
              <span className="flex-1 text-left tracking-wide">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
// 

