import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const LanguageSwitcher = ({ compact = false, className = '' }) => {
  const { language, setLanguage, options, t } = useLanguage();
  if (compact) {
    return (
      <label className={`relative inline-flex min-h-11 items-center ${className}`}>
        <span className="sr-only">{t('common.language')}</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label={t('common.language')}
          className="min-h-11 rounded-xl border border-surface-200 bg-white px-2.5 text-sm font-bold text-surface-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
        >
          {options.map((option) => <option key={option.code} value={option.code} lang={option.htmlLang}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-surface-200 bg-white/80 p-1 dark:border-surface-700 dark:bg-surface-900/80 ${className}`} role="group" aria-label={t('common.language')}>
      {options.map((option) => (
        <button key={option.code} type="button" lang={option.htmlLang} onClick={() => setLanguage(option.code)} aria-pressed={language === option.code} title={option.name} className={`inline-flex min-h-11 min-w-12 items-center justify-center rounded-lg px-2.5 text-sm font-bold transition-colors ${language === option.code ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
};
export default LanguageSwitcher;
