import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const bandLabel = (band, score, t) => {
  const normalised = String(band || '').toLowerCase().replaceAll('_', '-');
  if (normalised === 'very-strong') return t('match.bandVeryStrong');
  if (normalised === 'strong') return t('match.bandStrong');
  if (normalised === 'possible') return t('match.bandPossible');
  if (normalised === 'weak') return t('match.bandWeak');
  if (score >= 80) return t('match.bandVeryStrong');
  if (score >= 60) return t('match.bandStrong');
  if (score >= 40) return t('match.bandPossible');
  return t('match.bandWeak');
};

const DimensionIcon = ({ score, available }) => {
  if (!available) return <HelpCircle className="h-4 w-4 text-surface-400" aria-hidden="true" />;
  if (score >= 50) return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  return <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
};

const MatchExplanation = ({ match, compact = false }) => {
  const { t } = useLanguage();
  const dimensions = Array.isArray(match?.dimensionScores) ? match.dimensionScores : [];
  const label = bandLabel(match?.confidenceBand, Number(match?.similarityScore || 0), t);
  const availableCount = dimensions.filter((dimension) => dimension.evidenceAvailable).length;

  return (
    <section className="rounded-xl border border-primary-200/70 bg-primary-50/60 p-4 text-sm text-surface-700 dark:border-primary-900/50 dark:bg-primary-950/20 dark:text-surface-200" aria-label={t('match.explanationAria')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-surface-900 dark:text-white">
          <Info className="h-4 w-4 text-primary-600" aria-hidden="true" />
          {t('match.whySuggested')}
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize shadow-sm dark:bg-surface-900">
          {t('match.similarity', { label })}
        </span>
      </div>

      <p className="mt-2 leading-relaxed">{match?.reason || t('match.limitedEvidence')}</p>

      {dimensions.length > 0 && (
        <details className="mt-3" open={!compact}>
          <summary className="min-h-11 cursor-pointer rounded-lg py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            {t('match.breakdown', { available: availableCount, total: dimensions.length })}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {dimensions.map((dimension) => (
              <div key={dimension.key} className="rounded-lg border border-white/80 bg-white/70 p-2.5 dark:border-surface-800 dark:bg-surface-900/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <DimensionIcon score={dimension.score} available={dimension.evidenceAvailable} />
                    {dimension.label}
                  </span>
                  <span className="text-xs font-bold">{dimension.evidenceAvailable ? `${dimension.score}%` : t('match.missing')}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-400">{dimension.explanation}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        {t('match.ownershipNotice')}
      </div>
    </section>
  );
};

export default MatchExplanation;
