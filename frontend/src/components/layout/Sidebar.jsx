// ============================================
// Sidebar Component
// Navigation links for student dashboard panels
// ============================================

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiPlusCircle,
  FiFileText,
  FiActivity,
  FiCheckSquare,
  FiBell,
  FiUser,
  FiPackage
} from 'react-icons/fi';
import { useSelector } from 'react-redux';

export const Sidebar = () => {
  const { unreadCount } = useSelector((state) => state.notifications);

  const links = [
    { label: 'Overview', path: '/dashboard', icon: <FiGrid /> },
    { label: 'Report Lost', path: '/dashboard/report-lost', icon: <FiPlusCircle /> },
    { label: 'Report Found', path: '/dashboard/report-found', icon: <FiPackage /> },
    { label: 'My Lost Reports', path: '/dashboard/my-lost', icon: <FiFileText /> },
    { label: 'My Found Listings', path: '/dashboard/my-found', icon: <FiFileText /> },
    { label: 'AI Matches', path: '/dashboard/my-matches', icon: <FiActivity /> },
    {
      label: 'Notifications',
      path: '/dashboard/notifications',
      icon: <FiBell />,
      badge: unreadCount > 0 ? unreadCount : null
    },
    { label: 'My Profile', path: '/dashboard/profile', icon: <FiUser /> }
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-surface-200/50 bg-white/40 dark:border-surface-800/50 dark:bg-surface-950/40 backdrop-blur-xl transition-colors duration-300 p-5 hidden lg:flex flex-col no-print">
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/dashboard'}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <span className="text-[1.15rem] opacity-90">{link.icon}</span>
            <span className="flex-1 font-semibold tracking-wide">{link.label}</span>
            {link.badge && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-primary-500 rounded-full shadow-sm">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;

