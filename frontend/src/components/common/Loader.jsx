import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const Loader = ({ size = 'md', fullPage = false, fullScreen = false, className = '' }) => {
  const { t } = useLanguage();
  const sizeClasses = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' };
  const spinner = <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-label={t('common.loading')}><img src="/logo.png" alt="" aria-hidden="true" className={`inline-block animate-search-circle object-contain ${sizeClasses[size] || sizeClasses.md}`} /><span className="sr-only">{t('common.loading')}</span></div>;
  if (fullPage || fullScreen) return <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-6" role="status" aria-label={t('loader.application')}><img src="/logo.png" alt="" aria-hidden="true" className="inline-block h-16 w-16 animate-search-circle object-contain sm:h-20 sm:w-20" /><span className="animate-pulse text-sm font-medium text-surface-500 dark:text-surface-400">{t('loader.application')}</span></div>;
  return spinner;
};

export default Loader;
