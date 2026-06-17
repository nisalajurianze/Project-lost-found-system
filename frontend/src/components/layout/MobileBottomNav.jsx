import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiPlusCircle, FiActivity, FiUser, FiPackage } from 'react-icons/fi';
import { useSelector } from 'react-redux';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Only show bottom nav for authenticated users
  if (!isAuthenticated) return null;

  // Mobile bottom navigation bar links
  const mobileNavLinks = [
    { label: 'Home', path: '/', icon: <FiHome /> },
    { label: 'Dashboard', path: '/dashboard', icon: <FiActivity /> },
    { label: 'Lost', path: '/dashboard/report-lost', icon: <FiPlusCircle /> },
    { label: 'Found', path: '/dashboard/report-found', icon: <FiPackage /> },
    { label: 'Profile', path: '/dashboard/profile', icon: <FiUser /> }
  ];

  const isMobileActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-surface-950/85 backdrop-blur-lg border-t border-surface-200/50 dark:border-surface-800/50 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around no-print">
      {mobileNavLinks.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`flex flex-col items-center gap-1 text-[10px] sm:text-xs font-medium transition-colors ${
            isMobileActive(link.path)
              ? 'text-primary-500 dark:text-primary-400'
              : 'text-surface-500 dark:text-surface-400'
          }`}
        >
          <span className="text-xl sm:text-2xl">{link.icon}</span>
          <span>{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileBottomNav;
