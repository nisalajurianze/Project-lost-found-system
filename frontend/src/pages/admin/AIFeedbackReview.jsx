import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import aiFeedbackService from '../../services/aiFeedbackService';
import { useLanguage } from '../../i18n/LanguageContext';
import adminService from '../../services/adminService';

const AIFeedbackReview = () => {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [calibration, setCalibration] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [handoffs, setHandoffs] = useState([]);
  const [algorithmVersion, setAlgorithmVersion] = useState('match-calibration-v1');
  const [threshold, setThreshold] = useState(70);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, calibrationData, duplicateData, handoffData] = await Promise.all([
        aiFeedbackService.list({ status: status || undefined, limit: 100 }),
        aiFeedbackService.getCalibration(),
        adminService.getDuplicateReviews({ status: 'pending', limit: 20 }),
        adminService.getAssistantHandoffs({ status: 'queued', limit: 20 }),
      ]);
      setRecords(data.feedback || []);
      setCalibration(calibrationData);
      setDuplicates(duplicateData.clusters || []);
      setHandoffs(handoffData.handoffs || []);
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

  const sealSnapshot = async () => {
    setSaving('snapshot');
    try {
      await aiFeedbackService.sealSnapshot(threshold);
      toast.success(t('aiFeedback.snapshotSealed'));
      await load();
    } catch {
      toast.error(t('aiFeedback.governanceError'));
    } finally { setSaving(''); }
  };

  const createChallenger = async () => {
    if (!calibration?.latestSnapshot?._id || !algorithmVersion.trim()) return;
    setSaving('challenger');
    try {
      await aiFeedbackService.createChallenger({ snapshotId: calibration.latestSnapshot._id, algorithmVersion: algorithmVersion.trim(), threshold });
      toast.success(t('aiFeedback.challengerCreated'));
      await load();
    } catch {
      toast.error(t('aiFeedback.governanceError'));
    } finally { setSaving(''); }
  };

  const promote = async (id) => {
    setSaving(id);
    try {
      await aiFeedbackService.promoteChallenger(id);
      toast.success(t('aiFeedback.championPromoted'));
      await load();
    } catch {
      toast.error(t('aiFeedback.governanceError'));
    } finally { setSaving(''); }
  };

  const reviewDuplicate = async (id, nextStatus) => {
    setSaving(id);
    try {
      await adminService.reviewDuplicate(id, nextStatus, `Admin duplicate review: ${nextStatus}`);
      toast.success(t('aiFeedback.duplicateReviewed'));
      await load();
    } catch {
      toast.error(t('aiFeedback.governanceError'));
    } finally { setSaving(''); }
  };

  const reviewHandoff = async (id, nextStatus) => {
    setSaving(id);
    try {
      await adminService.reviewAssistantHandoff(id, nextStatus, `Authorized helpdesk review: ${nextStatus}`);
      toast.success(t('aiFeedback.handoffReviewed'));
      await load();
    } catch {
      toast.error(t('aiFeedback.governanceError'));
    } finally { setSaving(''); }
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

      <section className="grid gap-4 xl:grid-cols-2" aria-label={t('aiFeedback.governanceTitle')}>
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Database aria-hidden="true" className="h-5 w-5" />{t('aiFeedback.governanceTitle')}</h2>
          <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{calibration?.policy || t('aiFeedback.governancePolicy')}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt>{t('aiFeedback.approvedOutcomes')}</dt><dd className="text-xl font-extrabold">{calibration?.approvedCount || 0}</dd></div>
            <div><dt>{t('aiFeedback.pendingOutcomes')}</dt><dd className="text-xl font-extrabold">{calibration?.pendingCount || 0}</dd></div>
          </dl>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_7rem]">
            <input value={algorithmVersion} onChange={(event) => setAlgorithmVersion(event.target.value.slice(0, 50))} aria-label={t('aiFeedback.algorithmVersion')} className="min-h-11 rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900" />
            <input type="number" min="1" max="99" value={threshold} onChange={(event) => setThreshold(Math.min(99, Math.max(1, Number(event.target.value) || 70)))} aria-label={t('aiFeedback.threshold')} className="min-h-11 rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving === 'snapshot'} onClick={sealSnapshot} className="btn btn-outline btn-sm">{t('aiFeedback.sealSnapshot')}</button>
            <button type="button" disabled={saving === 'challenger' || !calibration?.latestSnapshot?._id} onClick={createChallenger} className="btn btn-primary btn-sm">{t('aiFeedback.createChallenger')}</button>
          </div>
          {calibration?.latestSnapshot?.metrics && <p className="mt-3 text-xs">{t('aiFeedback.latestMetrics', { count: calibration.latestSnapshot.metrics.sampleSize || 0, accuracy: calibration.latestSnapshot.metrics.accuracy || 0, fpr: calibration.latestSnapshot.metrics.falsePositiveRate || 0 })}</p>}
          {calibration?.challengers?.map((experiment) => <div key={experiment._id} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 p-3 text-sm dark:bg-surface-900/70"><span>{experiment.algorithmVersion} · {experiment.metrics?.sampleSize || 0} samples</span><button type="button" disabled={saving === experiment._id} onClick={() => promote(experiment._id)} className="btn btn-success btn-sm">{t('aiFeedback.promote')}</button></div>)}
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><AlertTriangle aria-hidden="true" className="h-5 w-5" />{t('aiFeedback.duplicateTitle')}</h2>
          <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{t('aiFeedback.duplicatePolicy')}</p>
          <div className="mt-4 space-y-3">
            {duplicates.map((cluster) => <div key={cluster._id} className="rounded-xl border border-amber-200 bg-white/80 p-3 text-sm dark:border-amber-900 dark:bg-surface-900/70"><div className="flex flex-wrap justify-between gap-2"><strong>{cluster.riskScore}% · {cluster.candidates?.length || 0} candidates</strong><span>{cluster.accountCount} accounts</span></div><p className="mt-1 text-xs">{(cluster.signals || []).join(', ')}</p><div className="mt-2 flex gap-2"><button type="button" disabled={saving === cluster._id} onClick={() => reviewDuplicate(cluster._id, 'confirmed-duplicate')} className="btn btn-warning btn-sm">{t('aiFeedback.confirmDuplicate')}</button><button type="button" disabled={saving === cluster._id} onClick={() => reviewDuplicate(cluster._id, 'dismissed')} className="btn btn-outline btn-sm">{t('aiFeedback.dismiss')}</button></div></div>)}
            {!loading && duplicates.length === 0 && <p className="text-sm text-surface-500">{t('aiFeedback.noDuplicates')}</p>}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 dark:border-cyan-900/60 dark:bg-cyan-950/20" aria-labelledby="assistant-handoff-queue">
        <h2 id="assistant-handoff-queue" className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck aria-hidden="true" className="h-5 w-5" />{t('aiFeedback.handoffTitle')}</h2>
        <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{t('aiFeedback.handoffPolicy')}</p>
        <div className="mt-4 grid gap-3">
          {handoffs.map((handoff) => <article key={handoff._id} className="rounded-xl border border-cyan-200 bg-white/85 p-4 text-sm dark:border-cyan-900 dark:bg-surface-900/75"><div className="flex flex-wrap justify-between gap-2"><strong>{handoff.requestedBy?.fullName || t('common.user')}</strong><span>{handoff.responseStyle} · {handoff.status}</span></div><p className="mt-2 break-words text-surface-700 dark:text-surface-200">{handoff.redactedSummary}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={saving === handoff._id} onClick={() => reviewHandoff(handoff._id, 'in-progress')} className="btn btn-outline btn-sm">{t('aiFeedback.startHandoff')}</button><button type="button" disabled={saving === handoff._id} onClick={() => reviewHandoff(handoff._id, 'resolved')} className="btn btn-success btn-sm">{t('aiFeedback.resolveHandoff')}</button></div></article>)}
          {!loading && handoffs.length === 0 && <p className="text-sm text-surface-500">{t('aiFeedback.noHandoffs')}</p>}
        </div>
      </section>

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
