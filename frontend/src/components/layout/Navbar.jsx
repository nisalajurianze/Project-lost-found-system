// ============================================
// Navbar Component
// Theme triggers, navigation menus, and profile dropdowns
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { logoutUser } from '../../redux/slices/authSlice';
import { fetchUserNotifications, markAllNotificationsRead, markNotificationRead } from '../../redux/slices/notificationSlice';
import { FiSun, FiMoon, FiBell, FiMenu, FiX, FiUser, FiLogOut, FiSettings, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/formatDate';

export const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const notificationDropdownRef = React.useRef(null);
  const mobileNotificationDropdownRef = React.useRef(null);
  const profileDropdownRef = React.useRef(null);
  const mobileProfileDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideDesktopNotif = notificationDropdownRef.current && notificationDropdownRef.current.contains(event.target);
      const isInsideMobileNotif = mobileNotificationDropdownRef.current && mobileNotificationDropdownRef.current.contains(event.target);
      
      if (!isInsideDesktopNotif && !isInsideMobileNotif) {
        setNotificationDropdownOpen(false);
      }

      const isInsideDesktopProfile = profileDropdownRef.current && profileDropdownRef.current.contains(event.target);
      const isInsideMobileProfile = mobileProfileDropdownRef.current && mobileProfileDropdownRef.current.contains(event.target);

      if (!isInsideDesktopProfile && !isInsideMobileProfile) {
        setProfileDropdownOpen(false);
      }
    };
    if (notificationDropdownOpen || profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationDropdownOpen, profileDropdownOpen]);

  const themeMode = useSelector((state) => state.theme.mode);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { unreadCount, notifications = [] } = useSelector((state) => state.notifications);

  const handleBellClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
    if (!notificationDropdownOpen && (!notifications || notifications.length === 0)) {
      dispatch(fetchUserNotifications({ page: 1, limit: 5 }));
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Lost Items', path: '/lost-items' },
    { label: 'Found Items', path: '/found-items' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  const isActive = (path) => location.pathname === path;

  const getNotificationLink = (notification) => {
    if (notification.link) return notification.link;
    if (notification.relatedItem) {
      const { itemType, itemId } = notification.relatedItem;
      if (itemType === 'Match') return '/dashboard/my-matches';
      if (itemType === 'LostItem') return `/lost-items/${itemId}`;
      if (itemType === 'FoundItem') return `/found-items/${itemId}`;
      if (itemType === 'ClaimRequest') return '/dashboard/my-connections';
    }
    return null;
  };

  const renderNotificationDropdown = () => (
    <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800 z-50 overflow-hidden flex flex-col transition-all duration-300 origin-top-right ${
      notificationDropdownOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible pointer-events-none'
    }`}>
      <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
        <h3 className="font-bold text-surface-900 dark:text-white">Recent Notifications</h3>
        {unreadCount > 0 && (
          <button 
            onClick={() => dispatch(markAllNotificationsRead())}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Mark all as read
          </button>
        )}
      </div>
      
      <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
        {notifications.length > 0 ? (
          notifications.slice(0, 5).map(notification => (
            <div 
              key={notification._id}
              onClick={() => {
                if (!notification.isRead) dispatch(markNotificationRead(notification._id));
                const link = getNotificationLink(notification);
                if (link) {
                  navigate(link);
                  setNotificationDropdownOpen(false);
                }
              }}
              className={`p-4 border-b border-surface-100 dark:border-surface-700/50 cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/30 ${
                !notification.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
              }`}
            >
              <div className="flex gap-3">
                <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${!notification.isRead ? 'bg-primary-500' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${!notification.isRead ? 'font-bold text-surface-900 dark:text-white' : 'font-medium text-surface-700 dark:text-surface-300'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2 flex items-center gap-1 font-medium">
                    <FiClock /> {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <FiCheckCircle className="mx-auto text-3xl text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">No recent notifications</p>
          </div>
        )}
      </div>
      <Link 
        to="/dashboard/notifications"
        onClick={() => setNotificationDropdownOpen(false)}
        className="px-4 py-3 text-center text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors border-t border-surface-100 dark:border-surface-700"
      >
        View All Notifications
      </Link>
    </div>
  );

  const renderProfileDropdown = () => (
    <div className={`absolute right-0 mt-2 w-56 rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800 z-50 overflow-hidden flex flex-col transition-all duration-300 origin-top-right ${
      profileDropdownOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible pointer-events-none'
    }`}>
      <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
        <p className="text-sm font-bold text-surface-900 dark:text-white truncate">{user?.fullName}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{user?.email}</p>
      </div>
      
      <div className="flex flex-col py-2">
        <Link 
          to="/dashboard/profile" 
          onClick={() => setProfileDropdownOpen(false)} 
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
        >
          <FiUser className="text-surface-400 text-lg" /> My Profile
        </Link>
        <Link 
          to="/dashboard/my-lost" 
          onClick={() => setProfileDropdownOpen(false)} 
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
        >
          <FiFileText className="text-surface-400 text-lg" /> My Lost Reports
        </Link>
        <Link 
          to="/dashboard/my-found" 
          onClick={() => setProfileDropdownOpen(false)} 
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
        >
          <FiFileText className="text-surface-400 text-lg" /> My Found Listings
        </Link>
        {user?.role === 'admin' && (
          <Link 
            to="/admin" 
            onClick={() => setProfileDropdownOpen(false)} 
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
          >
            👑 Admin Panel
          </Link>
        )}
      </div>

      <div className="border-t border-surface-100 dark:border-surface-700 py-1">
        <button 
          onClick={handleLogout} 
          className="flex w-full items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <FiLogOut className="text-lg" /> Log Out
        </button>
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-surface-200/50 bg-white/75 backdrop-blur-md dark:border-surface-800/50 dark:bg-surface-900/75 transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Smart L&F Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain translate-y-0.5" />
            <span className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent whitespace-nowrap">
              Smart L&F
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Action Icons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 text-surface-500 hover:bg-surface-100 rounded-xl dark:text-surface-400 dark:hover:bg-surface-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {themeMode === 'dark' ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
            </button>

            {/* Notification Bell */}
            {isAuthenticated && (
              <div className="relative" ref={notificationDropdownRef}>
                <button
                  onClick={handleBellClick}
                  className="relative p-2 text-surface-500 hover:bg-surface-100 rounded-xl dark:text-surface-400 dark:hover:bg-surface-800 transition-colors focus:outline-none"
                  aria-label="Notifications"
                >
                  <FiBell className="text-xl" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-surface-900 animate-pulse-glow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {renderNotificationDropdown()}
              </div>
            )}

            {/* User Profile Dropdown Link */}
            {isAuthenticated ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all focus:outline-none hover:ring-2 hover:ring-primary-500/50"
                  title="Profile Menu"
                >
                  {user?.profileImage?.url ? (
                    <img
                      src={user.profileImage.url}
                      alt={user.fullName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold font-display">
                      {getInitials(user?.fullName)}
                    </div>
                  )}
                </button>
                {renderProfileDropdown()}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-surface-700 hover:text-surface-900 dark:text-surface-200 dark:hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm rounded-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

            {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2 sm:gap-3">
            {/* Mobile Notification Bell */}
            {isAuthenticated && (
              <div className="relative" ref={mobileNotificationDropdownRef}>
                <button
                  onClick={handleBellClick}
                  className="relative p-2 text-surface-500 rounded-xl dark:text-surface-400 transition-colors focus:outline-none bg-surface-100 dark:bg-surface-800 hover:text-primary-500"
                  aria-label="Notifications"
                >
                  <FiBell className="text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-surface-900 animate-pulse-glow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {/* Notification Dropdown */}
                {renderNotificationDropdown()}
              </div>
            )}

            {/* Mobile Profile Avatar */}
            {isAuthenticated && (
              <div className="relative" ref={mobileProfileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="p-1 rounded-full border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all focus:outline-none"
                >
                  {user?.profileImage?.url ? (
                    <img
                      src={user.profileImage.url}
                      alt={user.fullName}
                      className="h-9 w-9 rounded-full object-cover border-2 border-surface-200 dark:border-surface-700"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold font-display border-2 border-primary-100 dark:border-primary-900">
                      {getInitials(user?.fullName)}
                    </div>
                  )}
                </button>
                {renderProfileDropdown()}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-full border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all focus:outline-none"
            >
              {mobileMenuOpen ? (
                <div className="h-9 w-9 flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-full"><FiX className="text-xl text-surface-500 dark:text-surface-400" /></div>
              ) : (
                <div className="h-9 w-9 flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-full"><FiMenu className="text-xl text-surface-500 dark:text-surface-400" /></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full h-[calc(100vh-5rem)] bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-t border-surface-200 dark:border-surface-800 p-6 animate-fade-in z-50 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-semibold px-4 py-3.5 rounded-xl transition-all ${
                  isActive(link.path)
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between px-2">
              <span className="text-surface-600 dark:text-surface-400 font-medium">Theme Mode</span>
              <button
                onClick={() => dispatch(toggleTheme())}
                className="p-3 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {themeMode === 'dark' ? <><FiSun className="text-xl" /> Light</> : <><FiMoon className="text-xl" /> Dark</>}
              </button>
            </div>
            
            {!isAuthenticated && (
              <div className="flex flex-col gap-3 mt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-secondary w-full py-3.5 text-lg"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary w-full py-3.5 text-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

