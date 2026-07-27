import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiPlus, FiActivity, FiUser, FiLogIn } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import Modal from '../common/Modal';
import { useLanguage } from '../../i18n/LanguageContext';

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const handleAssistantState = (event) => setAssistantOpen(Boolean(event.detail?.isOpen));
    window.addEventListener('lf:assistant-state', handleAssistantState);
    return () => window.removeEventListener('lf:assistant-state', handleAssistantState);
  }, []);

  if (location.pathname.startsWith('/admin') || assistantOpen) return null;

  const links = [
    { id: 'home', label: t('common.home'), path: '/', icon: FiHome },
    { id: 'search', label: t('common.search'), path: '/search', icon: FiSearch },
    isAuthenticated
      ? { id: 'activity', label: t('common.activity'), path: '/dashboard/my-matches', icon: FiActivity }
      : { id: 'login', label: t('common.login'), path: '/login', icon: FiLogIn },
    isAuthenticated
      ? { id: 'profile', label: t('common.profile'), path: '/dashboard/profile', icon: FiUser }
      : { id: 'account', label: t('common.account'), path: '/register', icon: FiUser },
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const openReportMenu = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname, message: t('nav.loginToReport') } });
      return;
    }
    setIsReportMenuOpen(true);
  };

  return (
    <>
      <nav aria-label={t('nav.mobilePrimary')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-surface-200/70 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-surface-800/70 dark:bg-surface-950/95 lg:hidden no-print">
        {links.slice(0, 2).map(({ id, label, path, icon: Icon }) => (
          <Link key={id} to={path} aria-current={isActive(path) ? 'page' : undefined} className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold ${isActive(path) ? 'text-primary-600 dark:text-primary-300' : 'text-surface-500 dark:text-surface-400'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}

        <button type="button" onClick={openReportMenu} className="relative -top-3 mx-auto flex min-h-16 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full border-4 border-white bg-primary-600 text-xs font-bold text-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 dark:border-surface-950" aria-haspopup={isAuthenticated ? 'dialog' : undefined} aria-label={t('nav.reportAria')}>
          <FiPlus className="h-6 w-6" aria-hidden="true" /><span>{t('common.report')}</span>
        </button>

        {links.slice(2).map(({ id, label, path, icon: Icon }) => (
          <Link key={id} to={path} aria-current={isActive(path) ? 'page' : undefined} className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold ${isActive(path) ? 'text-primary-600 dark:text-primary-300' : 'text-surface-500 dark:text-surface-400'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}
      </nav>

      <Modal isOpen={isReportMenuOpen} onClose={() => setIsReportMenuOpen(false)} title={t('nav.reportPrompt')} size="sm">
        <div className="grid gap-3">
          <Link to="/dashboard/report-lost" onClick={() => setIsReportMenuOpen(false)} className="flex min-h-16 items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 text-base font-bold text-rose-800 hover:border-rose-400 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200">
            {t('nav.lostAction')} <span aria-hidden="true">→</span>
          </Link>
          <Link to="/dashboard/report-found" onClick={() => setIsReportMenuOpen(false)} className="flex min-h-16 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-base font-bold text-emerald-800 hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200">
            {t('nav.foundAction')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Modal>
    </>
  );
};

export default MobileBottomNav;
