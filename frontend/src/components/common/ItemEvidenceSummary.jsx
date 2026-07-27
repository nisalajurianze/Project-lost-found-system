import React from 'react';
import { BrainCircuit, UserRound } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const ItemEvidenceSummary = ({ item }) => {
  const { t } = useLanguage();
  const ownerValues = [
    ['Brand', item?.brand], ['Model', item?.model], ['Colours', Array.isArray(item?.colors) ? item.colors.join(', ') : item?.colors],
    ['Material', item?.material], ['Unique features', Array.isArray(item?.uniqueFeatures) ? item.uniqueFeatures.join(', ') : item?.uniqueFeatures],
  ].filter(([, value]) => String(value || '').trim());
  const quality = item?.reportQuality;
  if (!ownerValues.length && !quality?.assessedAt) return null;
  return <section className="grid gap-4 md:grid-cols-2" aria-label={t('evidence.title')}>
    <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900/60"><h3 className="flex items-center gap-2 font-bold"><UserRound className="h-5 w-5 text-primary-600" />{t('evidence.owner')}</h3>{ownerValues.length ? <dl className="mt-3 space-y-2 text-sm">{ownerValues.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-surface-500">{label}</dt><dd className="mt-0.5 text-surface-800 dark:text-surface-200">{value}</dd></div>)}</dl> : <p className="mt-3 text-sm text-surface-500">{t('evidence.none')}</p>}</div>
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-900/50 dark:bg-violet-950/20"><h3 className="flex items-center gap-2 font-bold"><BrainCircuit className="h-5 w-5 text-violet-600" />{t('evidence.ai')}</h3>{quality?.assessedAt ? <><p className="mt-3 text-2xl font-extrabold">{quality.score}% <span className="text-sm font-semibold capitalize text-surface-500">{quality.level}</span></p>{quality.suggestions?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{quality.suggestions.map((entry) => <li key={entry}>{entry}</li>)}</ul>}<p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">{t('evidence.advisory')}</p></> : <p className="mt-3 text-sm text-surface-500">{t('evidence.pending')}</p>}</div>
  </section>;
};
export default ItemEvidenceSummary;
