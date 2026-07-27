import React, { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Select from '../../components/common/Select';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchAdminAuditLogs } from '../../redux/slices/adminSlice';

const ACTIONS = [
  'USER_ACTIVATION', 'USER_DEACTIVATION', 'USER_PROMOTED', 'USER_DEMOTED',
  'CLAIM_APPROVAL', 'CLAIM_REJECTION', 'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE',
];

const AdminLogs = () => {
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const { logs, logsPagination, isLoading, error } = useSelector((state) => state.admin);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';

  useEffect(() => {
    dispatch(fetchAdminAuditLogs({ action: actionFilter, page, limit: 12 }));
  }, [dispatch, actionFilter, page]);

  const actionOptions = useMemo(() => ACTIONS.map((value) => ({
    value,
    label: t(`audit.action.${value}`, undefined, value),
  })), [t]);

  const formatTimestamp = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t('audit.notRecorded')
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const actionLabel = (action) => t(`audit.action.${action}`, undefined, action || t('audit.notRecorded'));
  const valueOrMissing = (value) => String(value || '').trim() || t('audit.notRecorded');

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <Activity aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          {t('audit.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('audit.subtitle')}</p>
      </header>

      <section className="card border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="w-full md:w-72">
          <Select
            label={t('audit.filterLabel')}
            value={actionFilter}
            onChange={(event) => { setActionFilter(event.target.value); setPage(1); }}
            options={actionOptions}
            placeholder={t('audit.allActions')}
          />
        </div>
      </section>

      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
        {t('audit.rawEvidenceNotice')}
      </p>

      {isLoading ? <Loader /> : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {t('audit.loadError', { error })}
        </div>
      ) : !logs?.length ? (
        <EmptyState title={t('audit.emptyTitle')} message={t('audit.emptyMessage')} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {logs.map((log) => (
              <article key={log._id} className="card border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('audit.action')}</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{actionLabel(log.action)}</p>
                    <code className="mt-1 block text-[11px] text-slate-500">{valueOrMissing(log.action)}</code>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={log.createdAt || undefined}>{formatTimestamp(log.createdAt)}</time>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold text-slate-500">{t('audit.officer')}</dt><dd className="mt-1">{log.adminId?.fullName || t('audit.systemActor')}</dd><dd className="text-xs text-slate-500">{log.adminId?.email || t('audit.notRecorded')}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{t('audit.target')}</dt><dd className="mt-1">{valueOrMissing(log.targetModel)}</dd><dd className="break-all font-mono text-[11px] text-slate-500">{valueOrMissing(log.targetId)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">{t('audit.details')}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{valueOrMissing(log.details)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">{t('audit.ip')}</dt><dd className="mt-1 font-mono text-xs">{valueOrMissing(log.ipAddress)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          {logsPagination.totalPages > 1 && <Pagination page={page} totalPages={logsPagination.totalPages} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
