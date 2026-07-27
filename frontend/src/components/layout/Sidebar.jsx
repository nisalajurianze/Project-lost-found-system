import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiPlusCircle, FiFileText, FiActivity, FiCheckSquare, FiBell, FiUser, FiPackage, FiLogOut } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';

export const Sidebar = () => {
  const { unreadCount } = useSelector((state) => state.notifications);
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const links = [
    { label: t('sidebar.overview'), path: '/dashboard', icon: <FiGrid /> },
    { label: t('nav.reportLost'), path: '/dashboard/report-lost', icon: <FiPlusCircle /> },
    { label: t('nav.reportFound'), path: '/dashboard/report-found', icon: <FiPackage /> },
    { label: t('profile.myLost'), path: '/dashboard/my-lost', icon: <FiFileText /> },
    { label: t('profile.myFound'), path: '/dashboard/my-found', icon: <FiFileText /> },
    { label: t('profile.myClaims'), path: '/dashboard/claims', icon: <FiCheckSquare /> },
    { label: t('sidebar.aiMatches'), path: '/dashboard/my-matches', icon: <FiActivity /> },
    { label: t('sidebar.notifications'), path: '/dashboard/notifications', icon: <FiBell />, badge: unreadCount > 0 ? unreadCount : null },
    { label: t('profile.myProfile'), path: '/dashboard/profile', icon: <FiUser /> }
  ];
  return (
    <aside className="w-64 flex-shrink-0 border-r border-surface-200/50 bg-white/40 dark:border-surface-800/50 dark:bg-surface-950/40 backdrop-blur-xl transition-colors duration-300 p-5 hidden lg:flex flex-col no-print sticky top-16 h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        {links.map((link) => <NavLink key={link.path} to={link.path} end={link.path === '/dashboard'} className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}><span className="text-[1.15rem] opacity-90">{link.icon}</span><span className="flex-1 font-semibold tracking-wide">{link.label}</span>{link.badge && <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-primary-500 rounded-full shadow-sm">{link.badge}</span>}</NavLink>)}
      </div>
      <div className="mt-auto pt-4 border-t border-surface-200/50 dark:border-surface-800/50"><button type="button" onClick={() => dispatch(logoutUser())} className="w-full flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"><span className="text-[1.15rem]"><FiLogOut /></span><span className="flex-1 text-left">{t('common.logout')}</span></button></div>
    </aside>
  );
};
export default Sidebar;
