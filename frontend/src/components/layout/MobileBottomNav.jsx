import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPackage, FiGrid, FiLogIn } from 'react-icons/fi';
import { useSelector } from 'react-redux';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Mobile bottom navigation bar links
  const mobileNavLinks = [
    { label: 'Home', path: '/', icon: <FiHome /> },
    { label: 'Lost', path: '/lost-items', icon: <FiSearch /> },
    { label: 'Found', path: '/found-items', icon: <FiPackage /> },
    isAuthenticated
      ? { label: 'Dashboard', path: '/dashboard', icon: <FiGrid /> }
      : { label: 'Log In', path: '/login', icon: <FiLogIn /> }
  ];

  const isMobileActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/login') return location.pathname === '/login';
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
