import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import aiFeedbackService from '../../services/aiFeedbackService';
import { useLanguage } from '../../i18n/LanguageContext';

const AIFeedbackReview = () => {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiFeedbackService.list({ status: status || undefined, limit: 100 });
      setRecords(data.feedback || []);
    } catch {
      toast.error(t('aiFeedback.loadError'));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => { load(); }, [load]);

  const review = async (record, nextStatus) => {
    setSaving(record._id);
    try {
      await aiFeedbackService.review(record._id, {
        status: nextStatus,
        reviewNote: `Admin AI feedback review: ${nextStatus}`,
      });
      toast.success(t('aiFeedback.reviewSuccess', { status: t(`common.${nextStatus}`, {}, nextStatus) }));
      await load();
    } catch {
      toast.error(t('aiFeedback.reviewError'));
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary-600">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            <span className="text-sm font-extrabold uppercase tracking-wider">{t('aiFeedback.eyebrow')}</span>
          </div>
          <h1 className="text-3xl font-extrabold">{t('aiFeedback.title')}</h1>
          <p className="mt-2 max-w-3xl text-surface-500">{t('aiFeedback.subtitle')}</p>
        </div>
        <button type="button" onClick={load} className="btn btn-outline btn-md"><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('common.refresh')}</button>
      </header>

      <label className="block max-w-xs text-sm font-semibold">
        {t('aiFeedback.reviewStatus')}
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900">
          <option value="">{t('common.all')}</option>
          <option value="pending">{t('common.pending')}</option>
          <option value="approved">{t('common.approved')}</option>
          <option value="rejected">{t('common.rejected')}</option>
        </select>
      </label>

      <div role="status" className="text-sm font-semibold text-surface-500">{loading ? t('aiFeedback.loading') : t('common.records', { count: records.length })}</div>

      <div className="grid gap-4">
        {records.map((record) => (
          <article key={record._id} className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-950">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-800 dark:bg-primary-950/40 dark:text-primary-200">{record.targetType}</span>
                  <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-bold dark:bg-surface-800">{record.decision}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{t(`common.${record.status}`, {}, record.status)}</span>
                </div>
                <p className="mt-3 text-sm"><strong>{t('aiFeedback.submittedBy')}:</strong> {record.submittedBy?.fullName || t('common.user')}</p>
                {record.dimension && <p className="mt-1 text-sm"><strong>{t('aiFeedback.dimension')}:</strong> {record.dimension}</p>}
                {record.note && <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{record.note}</p>}
                <p className="mt-2 text-xs text-surface-500">{t('aiFeedback.policy')}: {record.policy} · {new Date(record.createdAt).toLocaleString(locale)}</p>
              </div>
              {record.status === 'pending' && (
                <div className="flex gap-2">
                  <button disabled={saving === record._id} type="button" onClick={() => review(record, 'approved')} className="btn btn-success btn-sm"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />{t('aiFeedback.approve')}</button>
                  <button disabled={saving === record._id} type="button" onClick={() => review(record, 'rejected')} className="btn btn-outline btn-sm text-red-600"><XCircle aria-hidden="true" className="h-4 w-4" />{t('aiFeedback.reject')}</button>
                </div>
              )}
            </div>
          </article>
        ))}
        {!loading && records.length === 0 && <div className="rounded-2xl border border-dashed border-surface-300 p-10 text-center text-surface-500">{t('aiFeedback.noRecords')}</div>}
      </div>
    </div>
  );
};

export default AIFeedbackReview;
