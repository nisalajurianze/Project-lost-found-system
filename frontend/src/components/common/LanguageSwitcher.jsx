import React, { useState, useRef, useEffect } from 'react';
import { FiGlobe, FiChevronDown, FiCheck } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export const LanguageSwitcher = ({ compact = false, className = '' }) => {
  const { language, setLanguage, options, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentOption = options.find((opt) => opt.code === language) || options[0];

  if (compact) {
    return (
      <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={t('common.language')}
          className={`min-h-11 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all shadow-xs ${
            isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-surface-800 text-primary-600 dark:text-primary-400'
              : 'border-surface-200 bg-white/90 text-surface-700 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900/90 dark:text-surface-200 dark:hover:bg-surface-800'
          }`}
        >
          <FiGlobe className="text-sm text-surface-400 dark:text-surface-400 transition-colors" aria-hidden="true" />
          <span>{currentOption?.label}</span>
          <FiChevronDown className={`text-xs text-surface-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label={t('common.language')}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px] overflow-hidden rounded-2xl border border-surface-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md dark:border-surface-700/90 dark:bg-surface-900/95 animate-fade-in"
          >
            {options.map((option) => {
              const isSelected = language === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  role="option"
                  lang={option.htmlLang}
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(option.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold text-left transition-all ${
                    isSelected
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                      : 'text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] opacity-75">{option.label}</span>
                    <span>{option.name}</span>
                  </span>
                  {isSelected && <FiCheck className="text-primary-600 dark:text-primary-400 text-sm shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
