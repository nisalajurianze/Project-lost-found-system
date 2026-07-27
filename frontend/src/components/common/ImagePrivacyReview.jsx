import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../../i18n/LanguageContext';

const ImagePrivacyReview = ({
  reviews = [],
  isScanning = false,
  isRedacting = false,
  onRedactRequired,
  onConfirmManualReview,
}) => {
  const { t } = useLanguage();
  if (!isScanning && reviews.length === 0) return null;

  const redactionRequired = reviews.filter((review) => review.status === 'redaction-required');
  const manualReview = reviews.filter((review) => review.status === 'manual-review');
  const completed = reviews.filter((review) => ['safe', 'redacted', 'manually-reviewed'].includes(review.status));

  return (
    <section className="mt-4 rounded-2xl border border-surface-200 bg-white/80 p-4 dark:border-surface-700 dark:bg-surface-900/70" aria-labelledby="image-privacy-review-title">
      <h3 id="image-privacy-review-title" className="flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white">
        <ShieldCheck className="h-5 w-5 text-primary-600" aria-hidden="true" />
        {t('report.privacyReviewTitle')}
      </h3>
      <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">{t('report.privacyReviewDesc')}</p>

      {isScanning && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('report.privacyScanning')}
        </div>
      )}

      {redactionRequired.length > 0 && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100" role="alert">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {t('report.privacySensitive')}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {redactionRequired.map((review) => (
              <li key={review.key}>{t('report.privacyRegionSummary', { file: review.fileName, count: review.regions.length, reasons: review.regions.map((region) => region.reason).join(', ') })}</li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={onRedactRequired} disabled={isRedacting || isScanning} className="mt-3 min-h-11 border-rose-300 bg-white text-rose-800 hover:bg-rose-100 dark:bg-surface-900 dark:text-rose-100">
            {isRedacting ? t('report.privacyCreating') : t('report.privacyPixelate')}
          </Button>
          <p className="mt-2 text-xs">{t('report.privacyReplacement')}</p>
        </div>
      )}

      {manualReview.map((review) => (
        <div key={review.key} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100" role="status">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {t('report.privacyManualTitle', { file: review.fileName })}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(review.warnings?.length ? review.warnings : [t('report.privacyManualFallback')]).map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={() => onConfirmManualReview(review.key)} className="mt-3 min-h-11">{t('report.privacyManualConfirm')}</Button>
        </div>
      ))}

      {completed.length > 0 && redactionRequired.length === 0 && manualReview.length === 0 && !isScanning && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('report.privacyComplete', { count: completed.length })}</span>
        </div>
      )}
    </section>
  );
};

export default ImagePrivacyReview;
