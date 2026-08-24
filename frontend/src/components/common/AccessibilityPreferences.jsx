import React, { useEffect, useState } from 'react';
import { Accessibility, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  clearAccessibilityPreferences,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
} from '../../utils/accessibilityPreferences';

const AccessibilityPreferences = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadAccessibilityPreferences);

  useEffect(() => {
    setPreferences((current) => saveAccessibilityPreferences(current));
  }, []);

  const update = (field, value) => {
    setPreferences((current) => saveAccessibilityPreferences({ ...current, [field]: value }));
  };

  const reset = () => setPreferences(clearAccessibilityPreferences());

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden"
        aria-label={t('accessibility.open')}
        aria-haspopup="dialog"
      >
        <Accessibility className="h-6 w-6" aria-hidden="true" />
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('accessibility.title')} closeLabel={t('accessibility.close')}>
        <div className="space-y-6">
          <p className="text-sm text-surface-600 dark:text-surface-300">{t('accessibility.description')}</p>
          <fieldset>
            <legend className="text-sm font-bold text-surface-900 dark:text-white">{t('accessibility.textSize')}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ['default', t('accessibility.default')],
                ['large', t('accessibility.large')],
                ['xlarge', t('accessibility.xlarge')],
              ].map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-surface-200 px-3 dark:border-surface-700">
                  <input type="radio" name="accessibility-text-scale" value={value} checked={preferences.textScale === value} onChange={() => update('textScale', value)} className="h-5 w-5 accent-primary-600" />
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            {[
              ['highContrast', t('accessibility.highContrast'), t('accessibility.highContrastDesc')],
              ['reduceMotion', t('accessibility.reduceMotion'), t('accessibility.reduceMotionDesc')],
              ['lowEffects', t('accessibility.lowEffects'), t('accessibility.lowEffectsDesc')],
            ].map(([field, label, description]) => (
              <label key={field} className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                <input type="checkbox" checked={preferences[field]} onChange={(event) => update(field, event.target.checked)} className="mt-1 h-5 w-5 accent-primary-600" />
                <span><strong className="block text-sm text-surface-900 dark:text-white">{label}</strong><span className="mt-1 block text-xs text-surface-500 dark:text-surface-400">{description}</span></span>
              </label>
            ))}
          </div>
          <button type="button" onClick={reset} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-300 px-4 text-sm font-bold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"><RotateCcw className="h-4 w-4" aria-hidden="true" />{t('accessibility.reset')}</button>
          <p className="text-xs text-surface-500 dark:text-surface-400">{t('accessibility.storage')}</p>
        </div>
      </Modal>
    </>
  );
};

export default AccessibilityPreferences;
