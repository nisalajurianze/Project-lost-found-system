import React from 'react';
import Button from './Button';
import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const fieldKeys = {
  itemName: 'report.itemName',
  category: 'report.category',
  description: 'report.description',
  tags: 'report.searchTags',
  brand: 'report.brand',
  model: 'report.model',
  colors: 'report.colours',
  material: 'report.material',
  uniqueMarks: 'report.uniqueFeatures',
};

const displayValue = (value) => Array.isArray(value) ? value.join(', ') : String(value || '');

const AISuggestionReview = ({ suggestion, onApplyField, onApplyAll, onDismiss }) => {
  const { t } = useLanguage();
  if (!suggestion) return null;
  const fields = Object.keys(fieldKeys)
    .map((key) => ({ key, label: t(fieldKeys[key]), value: suggestion[key] }))
    .filter(({ value }) => displayValue(value).trim());

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/60 dark:bg-violet-950/20" aria-labelledby="ai-suggestion-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="ai-suggestion-title" className="flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" />
            {t('report.aiReviewTitle')}
          </h3>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">{t('report.aiReviewDesc')}</p>
        </div>
        <button type="button" onClick={onDismiss} className="min-h-11 min-w-11 rounded-lg p-2 text-surface-500 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-surface-900" aria-label={t('report.aiDismiss')}>
          <X className="mx-auto h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {suggestion.privacyWarnings?.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100" role="status">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {t('report.aiPrivacyRequired')}</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {suggestion.privacyWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {fields.map(({ key, label, value }) => {
          const confidence = Number(suggestion.fieldConfidence?.[key] || 0);
          return (
            <div key={key} className="grid gap-2 rounded-xl border border-violet-100 bg-white/80 p-3 dark:border-violet-900/40 dark:bg-surface-900/70 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
              <div className="text-sm font-semibold text-surface-700 dark:text-surface-200">{label}</div>
              <div className="min-w-0 text-sm text-surface-700 dark:text-surface-300">
                <span className={key === 'description' ? 'line-clamp-3' : 'break-words'}>{displayValue(value)}</span>
                {confidence > 0 && <span className="mt-1 block text-xs text-surface-500">{t('report.aiConfidence', { confidence })}</span>}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onApplyField(key, value)} className="min-h-11">{t('report.apply')}</Button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t('report.aiAdvisory')}
        </p>
        <Button type="button" onClick={onApplyAll} className="min-h-11">{t('report.applyAll')}</Button>
      </div>
    </section>
  );
};

export default AISuggestionReview;
