// ============================================
// Admin Panel Layout Wrapper
// Navbar, translated admin navigation, and routed content
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
  FiMapPin,
} from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';

export const AdminLayout = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const adminLinks = [
    { label: t('admin.navDashboard'), path: '/admin', icon: <FiGrid aria-hidden="true" />, end: true },
    { label: t('admin.manageUsers'), path: '/admin/users', icon: <FiUsers aria-hidden="true" /> },
    { label: t('admin.manageLost'), path: '/admin/lost-items', icon: <FiFileText aria-hidden="true" /> },
    { label: t('admin.manageFound'), path: '/admin/found-items', icon: <FiFileText aria-hidden="true" /> },
    { label: t('admin.manageCategories'), path: '/admin/categories', icon: <FiList aria-hidden="true" /> },
    { label: t('admin.locationKnowledge'), path: '/admin/locations', icon: <FiMapPin aria-hidden="true" /> },
    { label: t('admin.aiFeedback'), path: '/admin/ai-feedback', icon: <FiCheckCircle aria-hidden="true" /> },
    { label: t('admin.userFeedback'), path: '/admin/feedback', icon: <FiMessageSquare aria-hidden="true" /> },
    { label: t('admin.auditLogs'), path: '/admin/logs', icon: <FiShield aria-hidden="true" /> },
    { label: t('admin.siteSettings'), path: '/admin/settings', icon: <FiSettings aria-hidden="true" /> },
    { label: t('admin.studentPanel'), path: '/dashboard', icon: <FiArrowLeft aria-hidden="true" />, borderTop: true },
  ];

  const handleLogout = () => dispatch(logoutUser());

  const renderLink = (link, mobile = false) => (
    <NavLink
      key={link.path}
      to={link.path}
      end={link.end}
      onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
      className={({ isActive }) => {
        if (!mobile) {
          return `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${link.borderTop ? 'mt-2 pt-2 border-t border-surface-200/70 dark:border-surface-800/70' : ''}`;
        }
        return `${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/40'} flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${link.borderTop ? 'mt-2 pt-2 border-t border-surface-200/70 dark:border-surface-800/70' : ''}`;
      }}
    >
      <span className="text-[1.05rem] opacity-90 shrink-0">{link.icon}</span>
      <span className="font-medium whitespace-nowrap flex-1 truncate">{link.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar onMenuClick={() => setIsMobileMenuOpen((open) => !open)} isMenuOpen={isMobileMenuOpen} />
      <div className="flex-1 flex flex-col lg:flex-row w-full relative">
        <nav
          aria-label={t('admin.panelLabel')}
          className={`lg:hidden absolute left-0 right-0 z-10 bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl border-b border-surface-200 dark:border-surface-700/50 shadow-xl transition-all duration-300 origin-top overflow-hidden ${isMobileMenuOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex flex-col p-4 gap-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {adminLinks.map((link) => renderLink(link, true))}
            <div className="mt-2 pt-2 border-t border-surface-200/50 dark:border-surface-800/50">
              <button
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                className="w-full min-h-11 flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-600 font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
              >
                <FiLogOut className="text-[1.05rem] opacity-90" aria-hidden="true" />
                <span>{t('admin.logout')}</span>
              </button>
            </div>
          </div>
        </nav>

        <aside className="w-[280px] flex-shrink-0 border-r border-surface-200/50 bg-white/40 dark:border-surface-800/50 dark:bg-surface-950/40 backdrop-blur-xl p-3.5 hidden lg:flex flex-col no-print sticky top-16 h-[calc(100vh-4rem)]">
          <div className="mb-2.5 flex items-center justify-between rounded-xl border border-primary-500/20 bg-primary-500/10 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-bold tracking-wider text-primary-700 dark:text-primary-300 uppercase truncate">
                {t('admin.panelLabel')}
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-800 dark:text-primary-200 shrink-0">
              Admin
            </span>
          </div>

          <nav aria-label={t('admin.panelLabel')} className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {adminLinks.map((link) => renderLink(link))}
          </nav>

          <div className="mt-auto pt-2.5 border-t border-surface-200/50 dark:border-surface-800/50">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/25 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <FiLogOut className="text-[1.05rem] opacity-90 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left tracking-wide">{t('admin.logout')}</span>
            </button>
          </div>
        </aside>

        <main id="main-content" tabIndex={-1} className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 sm:pb-24 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
