import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPackage, FiGrid, FiLogIn, FiActivity } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Mobile bottom navigation bar links
  const mobileNavLinks = [
    { id: 'home', label: 'Home', path: '/', icon: <FiHome /> },
    { id: 'lost', label: 'Lost', path: '/lost-items', icon: <FiSearch /> },
    { id: 'found', label: 'Found', path: '/found-items', icon: <FiPackage /> },
    ...(isAuthenticated ? [{ id: 'matches', label: 'Matches', path: '/dashboard/my-matches', icon: <FiActivity /> }] : []),
    isAuthenticated
      ? { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <FiGrid /> }
      : { id: 'login', label: 'Log In', path: '/login', icon: <FiLogIn /> }
  ];

  const isMobileActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/login') return location.pathname === '/login';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-surface-950/85 backdrop-blur-lg border-t border-surface-200/50 dark:border-surface-800/50 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around no-print">
      <AnimatePresence initial={false}>
        {mobileNavLinks.map((link) => (
          <motion.div
            key={link.id}
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex justify-center"
          >
            <Link
              to={link.path}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] sm:text-xs font-medium transition-colors px-2 ${
                isMobileActive(link.path)
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-surface-500 dark:text-surface-400'
              }`}
            >
              <span className="text-xl sm:text-2xl">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MobileBottomNav;
