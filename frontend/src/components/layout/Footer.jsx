import React from 'react';
import { Link } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-surface-200/80 bg-white/95 dark:border-surface-800/80 dark:bg-surface-950/95 backdrop-blur-md transition-colors duration-300 pt-10 pb-24 lg:pb-10 no-print mt-auto">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start justify-between pb-8">
          
          {/* Brand & Mission Column */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 mb-2 hover:opacity-90 transition-opacity w-fit group">
              <img src="/logo.png" alt="Smart L&F" className="h-8 w-8 object-contain transition-transform group-hover:scale-105" />
              <span className="text-2xl font-black font-display tracking-tight bg-gradient-to-r from-primary-600 to-indigo-500 dark:from-primary-400 dark:to-indigo-300 bg-clip-text text-transparent">
                Smart L&F
              </span>
            </Link>
            <p className="text-sm text-surface-600 dark:text-surface-400 max-w-md leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-[11px] font-semibold text-surface-600 dark:border-surface-800 dark:bg-surface-900/60 dark:text-surface-400">
              <FiShield className="text-primary-500" />
              <span>Privacy-first AI verification</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-6 lg:col-span-7 flex justify-center md:justify-end md:pr-44">
            <div className="grid w-full max-w-sm grid-cols-1 gap-x-8 gap-y-1 text-sm font-semibold text-surface-600 dark:text-surface-400 text-left sm:grid-cols-2 sm:gap-x-12">
              <Link to="/about" className="inline-flex min-h-11 min-w-0 items-center break-words px-2.5 rounded-xl hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100/70 dark:hover:bg-surface-900/70 transition-colors">
                {t('common.about')}
              </Link>
              <Link to="/search" className="inline-flex min-h-11 min-w-0 items-center break-words px-2.5 rounded-xl hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100/70 dark:hover:bg-surface-900/70 transition-colors">
                {t('nav.searchItems')}
              </Link>
              <Link to="/contact" className="inline-flex min-h-11 min-w-0 items-center break-words px-2.5 rounded-xl hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100/70 dark:hover:bg-surface-900/70 transition-colors">
                {t('common.contact')}
              </Link>
              <Link to="/dashboard/report-found" className="inline-flex min-h-11 min-w-0 items-center break-words px-2.5 rounded-xl hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100/70 dark:hover:bg-surface-900/70 transition-colors">
                {t('nav.reportFound')}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Rights & Safety Note */}
        <div className="pt-6 border-t border-surface-200/60 dark:border-surface-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-600 dark:text-surface-400 text-center sm:text-left">
          <p>&copy; {currentYear} Smart Lost & Found. {t('footer.rights')}</p>
          <p className="text-surface-500 dark:text-surface-500">{t('footer.note')}</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
