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
      <nav aria-label={t('nav.mobilePrimary')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t border-surface-200/80 bg-white/95 px-1 h-16 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-surface-800/80 dark:bg-surface-950/95 xl:hidden no-print">
        {links.slice(0, 2).map(({ id, label, path, icon: Icon }) => (
          <Link key={id} to={path} aria-current={isActive(path) ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-xs font-semibold ${isActive(path) ? 'text-primary-600 dark:text-primary-300' : 'text-surface-500 dark:text-surface-400'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] truncate max-w-[62px] text-center">{label}</span>
          </Link>
        ))}

        <div className="relative -top-3.5 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={openReportMenu}
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 ring-4 ring-white dark:ring-surface-950 transition-all duration-200 active:scale-95 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
            aria-haspopup={isAuthenticated ? 'dialog' : undefined}
            aria-label={t('nav.reportAria')}
          >
            <FiPlus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
          </button>
          <span className="mt-0.5 text-[10px] font-bold text-primary-600 dark:text-primary-400 tracking-tight">
            {t('common.report')}
          </span>
        </div>

        {links.slice(2).map(({ id, label, path, icon: Icon }) => (
          <Link key={id} to={path} aria-current={isActive(path) ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-xs font-semibold ${isActive(path) ? 'text-primary-600 dark:text-primary-300' : 'text-surface-500 dark:text-surface-400'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] truncate max-w-[62px] text-center">{label}</span>
          </Link>
        ))}
      </nav>

      <Modal isOpen={isReportMenuOpen} onClose={() => setIsReportMenuOpen(false)} title={t('nav.reportPrompt')} size="sm">
        <div className="grid gap-3 pt-1">
          <Link
            to="/dashboard/report-lost"
            onClick={() => setIsReportMenuOpen(false)}
            className="group flex min-h-[72px] items-center justify-between rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50 to-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-rose-400 hover:shadow-md dark:border-rose-900/50 dark:bg-gradient-to-r dark:from-rose-950/40 dark:to-surface-800 dark:hover:border-rose-700"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-300 shadow-xs">
                <FiPlus className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-rose-950 dark:text-rose-100">{t('nav.lostAction')}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{t('report.lost')}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-rose-500 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>

          <Link
            to="/dashboard/report-found"
            onClick={() => setIsReportMenuOpen(false)}
            className="group flex min-h-[72px] items-center justify-between rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-emerald-400 hover:shadow-md dark:border-emerald-900/50 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:to-surface-800 dark:hover:border-emerald-700"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-300 shadow-xs">
                <FiPlus className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-emerald-950 dark:text-emerald-100">{t('nav.foundAction')}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('report.found')}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-emerald-500 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        </div>
      </Modal>
    </>
  );
};

export default MobileBottomNav;
