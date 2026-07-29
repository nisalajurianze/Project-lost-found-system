import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="w-full border-t border-surface-200/50 bg-white dark:border-surface-800/50 dark:bg-surface-950/80 transition-colors duration-300 py-8 no-print mt-auto pb-24 lg:pb-8">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="flex min-h-11 items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity w-fit">
              <img src="/logo.png" alt="Smart L&F" className="h-8 w-8 object-contain translate-y-0.5" />
              <span className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent whitespace-nowrap">Smart L&F</span>
            </Link>
            <p className="text-sm text-surface-500 dark:text-surface-400">{t('footer.tagline')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-surface-600 dark:text-surface-400 font-medium md:pr-44">
            <Link to="/about" className="inline-flex min-h-11 items-center px-1 hover:text-primary-500 transition-colors">{t('common.about')}</Link>
            <Link to="/contact" className="inline-flex min-h-11 items-center px-1 hover:text-primary-500 transition-colors">{t('common.contact')}</Link>
            <Link to="/lost-items" className="inline-flex min-h-11 items-center px-1 hover:text-primary-500 transition-colors">{t('nav.searchItems')}</Link>
            <Link to="/dashboard/report-found" className="inline-flex min-h-11 items-center px-1 hover:text-primary-500 transition-colors">{t('nav.reportFound')}</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-400">
          <p>&copy; {new Date().getFullYear()} Smart Lost & Found. {t('footer.rights')}</p><p>{t('footer.note')}</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
