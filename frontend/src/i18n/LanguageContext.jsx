import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_OPTIONS, translations } from './translations';

const STORAGE_KEY = 'lf-language';
const LanguageContext = createContext(null);
const supported = new Set(LANGUAGE_OPTIONS.map(({ code }) => code));

const resolveInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (supported.has(stored)) return stored;
  const browser = String(window.navigator.language || 'en').toLowerCase();
  if (browser.startsWith('si')) return 'si';
  if (browser.startsWith('ta')) return 'ta';
  return 'en';
};

const interpolate = (value, variables = {}) => Object.entries(variables).reduce(
  (text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)),
  value
);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(resolveInitialLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    if (!supported.has(nextLanguage)) return;
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    const option = LANGUAGE_OPTIONS.find(({ code }) => code === language) || LANGUAGE_OPTIONS[0];
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = option.htmlLang;
    document.documentElement.dir = 'ltr';
    document.documentElement.dataset.language = language;
  }, [language]);

  const t = useCallback((key, variables, fallback) => {
    const selected = translations[language]?.[key];
    const english = translations.en?.[key];
    return interpolate(selected ?? english ?? fallback ?? key, variables);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t, options: LANGUAGE_OPTIONS }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

export default LanguageContext;
