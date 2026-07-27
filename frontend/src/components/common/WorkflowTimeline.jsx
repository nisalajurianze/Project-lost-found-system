import React from 'react';
import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const itemSteps = [
  { key: 'reported', statuses: ['pending', 'available', 'matched', 'in_progress', 'claimed', 'closed'] },
  { key: 'matched', statuses: ['matched', 'in_progress', 'claimed', 'closed'] },
  { key: 'verification', statuses: ['in_progress', 'claimed', 'closed'] },
  { key: 'returned', statuses: ['claimed', 'closed'] },
];
const claimSteps = [
  { key: 'submitted' },
  { key: 'reviewing' },
  { key: 'connected' },
  { key: 'handover' },
  { key: 'completed' },
];


const WorkflowTimeline = ({ type = 'item', status, contactShared = false, className = '' }) => {
  const { t } = useLanguage();
  const normalized = String(status || '').toLowerCase();
  const steps = type === 'claim' ? claimSteps : itemSteps;
  return (
    <section className={`rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900/60 ${className}`} aria-label={t('workflow.timeline')}>
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-surface-500">{t('workflow.timeline')}</h3>
      <ol className={`mt-4 grid gap-3 ${type === 'claim' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`} aria-label={t('workflow.progress')}>
        {steps.map((step, index) => {
          let complete;
          let current;
          if (type === 'claim') {
            const completedThrough = normalized === 'completed' ? 4 : normalized === 'approved' ? (contactShared ? 2 : 1) : normalized === 'rejected' ? 1 : 0;
            complete = index <= completedThrough;
            current = normalized !== 'rejected' && !complete && index === completedThrough + 1;
          } else {
            complete = step.statuses.includes(normalized);
            current = !complete && steps.slice(0, index).every((candidate) => candidate.statuses.includes(normalized));
          }
          return <li key={step.key} className={`relative rounded-xl border p-3 ${complete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20' : current ? 'border-primary-300 bg-primary-50 dark:border-primary-900/50 dark:bg-primary-950/20' : 'border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-950/30'}`}>
            <div className="flex items-center gap-2">
              {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : current ? <Clock3 className="h-5 w-5 text-primary-600" aria-hidden="true" /> : <Circle className="h-5 w-5 text-surface-400" aria-hidden="true" />}
              <span className="text-sm font-bold">{t(`workflow.${step.key}`)}</span>
            </div>
          </li>;
        })}
      </ol>
      {type === 'claim' && normalized === 'rejected' && <p role="status" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">{t('workflow.rejected')}</p>}
    </section>
  );
};
export default WorkflowTimeline;
