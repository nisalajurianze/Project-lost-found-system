import React, { useEffect, useState } from 'react';
import { Award, BarChart3, Calendar, CheckCircle2, Lightbulb, MapPin, Send, ShieldAlert, TrendingUp } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import MonthlyReportsChart from '../../components/charts/MonthlyReportsChart';
import StatusPieChart from '../../components/charts/StatusPieChart';
import Loader from '../../components/common/Loader';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import adminService from '../../services/adminService';

const BRIEF_KEYS = {
  'reports-created-24h': 'analytics.brief.reportsCreated',
  'claims-pending-overdue': 'analytics.brief.claims',
  'strong-matches-review': 'analytics.brief.matches',
  'privacy-review': 'analytics.brief.privacy',
};

const Analytics = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { stats, isLoading, error } = useSelector((state) => state.admin);
  const [question, setQuestion] = useState('');
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => { dispatch(fetchAdminStats()); }, [dispatch]);
  if (isLoading && !stats) return <Loader fullScreen />;

  const summary = stats?.summary || { totalLostItems: 0, totalFoundItems: 0, successfulRecoveries: 0 };
  const analytics = stats?.analytics || { monthlyLost: [], monthlyFound: [], lostStatusBreakdown: {}, foundStatusBreakdown: {} };
  const intelligence = stats?.intelligence || {
    dailyBrief: [], dailyBriefItems: [], recovery: {}, hotspots: { locations: [], categories: [] },
    recommendations: { items: [] }, predictions: { categoryCohorts: [], locationCohorts: [], minimumSample: 10, noticeCode: 'insufficient' },
  };
  const recoveryRate = summary.totalLostItems > 0 ? Math.round((summary.successfulRecoveries / summary.totalLostItems) * 100) : 0;
  const totalReports = Number(summary.totalLostItems || 0) + Number(summary.totalFoundItems || 0);
  const statusLabelMap = Object.fromEntries(['pending', 'available', 'matched', 'in_progress', 'claimed', 'closed'].map((key) => [key, t(`analytics.status.${key}`)]));

  const dailyItems = intelligence.dailyBriefItems?.length
    ? intelligence.dailyBriefItems
    : (intelligence.dailyBrief || []).map((message, index) => ({ type: `legacy-${index}`, params: {}, message }));
  const renderBrief = (item) => {
    const key = BRIEF_KEYS[item.type];
    return key ? t(key, item.params) : item.message;
  };
  const renderRecommendation = (item) => t(`analytics.recommendation.${item.type}`, item.params, item.message);
  const predictionNotice = t(
    `analytics.cohort.${intelligence.predictions.noticeCode || (intelligence.predictions.dataSufficient ? 'available' : 'insufficient')}`,
    intelligence.predictions.noticeParams || { minimumSample: intelligence.predictions.minimumSample || 10 },
    intelligence.predictions.notice,
  );
  const statCards = [
    { Icon: TrendingUp, label: 'analytics.totalSubmissions', value: totalReports, help: 'analytics.totalSubmissionsHelp', iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { Icon: Award, label: 'analytics.returnRate', value: `${recoveryRate}%`, help: 'analytics.returnRateHelp', iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { Icon: CheckCircle2, label: 'analytics.successCount', value: summary.successfulRecoveries || 0, help: 'analytics.successCountHelp', iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
  ];

  const explain = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setIsExplaining(true);
    try {
      setExplanation(await adminService.explainAnalytics(question.trim()));
    } catch (requestError) {
      setExplanation({ answer: requestError.response?.data?.message || t('analytics.aiError'), evidence: [] });
    } finally { setIsExplaining(false); }
  };

  const CohortList = ({ title, cohorts }) => (
    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {cohorts?.length ? (
        <ul className="mt-3 space-y-3">
          {cohorts.map((cohort) => (
            <li key={`${title}-${cohort.label}`} className="rounded-xl border border-sky-200 bg-white/80 p-3 text-sm dark:border-sky-900/60 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{cohort.label}</strong><span className="text-xs font-semibold text-slate-500">{t('analytics.sample', { count: cohort.sampleSize })}</span></div>
              <p className="mt-2">{t('analytics.historicalRecovered', { recovered: cohort.recovered, rate: cohort.observedRecoveryRate })}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {t('analytics.interval', { lower: cohort.interval95?.lower ?? 0, upper: cohort.interval95?.upper ?? 0 })}
                {cohort.averageRecoveryHours == null ? '' : t('analytics.averageHoursInline', { hours: cohort.averageRecoveryHours })}
              </p>
              {!cohort.eligible && <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{t('analytics.belowMinimum')}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('analytics.noCohorts')}</p>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><BarChart3 aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />{t('analytics.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.subtitle')}</p>
      </header>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{t('analytics.loadError', { error })}</div>}

      <section className="grid gap-4 lg:grid-cols-3" aria-labelledby="operational-brief-title">
        <article className="card border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20 lg:col-span-2">
          <h2 id="operational-brief-title" className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><ShieldAlert aria-hidden="true" className="h-5 w-5 text-indigo-600" />{t('analytics.dailyBrief')}</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t('analytics.aggregateNotice')}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">{dailyItems.map((item, index) => <li key={`${item.type}-${index}`} className="rounded-lg bg-white/80 px-3 py-2 dark:bg-slate-900/70">{renderBrief(item)}</li>)}</ul>
        </article>
        <article className="card border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">{t('analytics.recoveryEvidence')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">{t('analytics.averageRecovery')}</dt><dd className="font-bold text-slate-950 dark:text-white">{intelligence.recovery.averageRecoveryHours == null ? t('analytics.insufficientOutcomes') : t('analytics.hours', { count: intelligence.recovery.averageRecoveryHours })}</dd></div>
            <div><dt className="text-slate-500">{t('analytics.durationSample')}</dt><dd className="font-bold text-slate-950 dark:text-white">{intelligence.recovery.sampleSize || 0}</dd></div>
            <div><dt className="text-slate-500">{t('analytics.approved30')}</dt><dd className="font-bold text-slate-950 dark:text-white">{intelligence.recovery.approvedClaimsLast30Days || 0}</dd></div>
          </dl>
        </article>
      </section>

      <section className="card border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-900/50 dark:bg-violet-950/20" aria-labelledby="grounded-analytics-title">
        <h2 id="grounded-analytics-title" className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><Lightbulb aria-hidden="true" className="h-5 w-5 text-violet-600" />{t('analytics.aiTitle')}</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t('analytics.aiNotice')}</p>
        <form onSubmit={explain} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="analytics-question" className="sr-only">{t('analytics.aiQuestion')}</label>
          <input id="analytics-question" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 300))} placeholder={t('analytics.aiPlaceholder')} className="min-h-11 flex-1 rounded-xl border border-violet-200 bg-white px-4 text-sm dark:border-violet-900 dark:bg-slate-950" />
          <button type="submit" disabled={isExplaining || !question.trim()} className="btn btn-primary btn-md"><Send aria-hidden="true" className="h-4 w-4" />{isExplaining ? t('analytics.aiWorking') : t('analytics.aiAsk')}</button>
        </form>
        {explanation?.answer && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-white/90 p-4 text-sm dark:border-violet-900 dark:bg-slate-950/80">
            <p>{explanation.answer}</p>
            <p className="mt-2 text-xs text-slate-500">{explanation.limitations || t('analytics.aiLimit')}</p>
          </div>
        )}
        {!explanation && intelligence.groundedNarrative?.statements?.length > 0 && <p className="mt-4 rounded-xl bg-white/80 p-4 text-sm dark:bg-slate-950/70">{intelligence.groundedNarrative.statements.join(' ')}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map(({ Icon, label, value, help, iconClass }) => (
          <article key={label} className="card flex items-center gap-4 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className={`rounded-lg p-3 ${iconClass}`}><Icon aria-hidden="true" className="h-6 w-6" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(label)}</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p><p className="mt-0.5 text-[11px] text-slate-400">{t(help)}</p></div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="card border border-slate-200 bg-white lg:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Calendar aria-hidden="true" className="h-5 w-5 text-indigo-500" />{t('analytics.monthlyVolume')}</h2>
          <MonthlyReportsChart monthlyLost={analytics.monthlyLost} monthlyFound={analytics.monthlyFound} lostLabel={t('analytics.chartLost')} foundLabel={t('analytics.chartFound')} emptyText={t('analytics.chartEmptyMonthly')} />
        </article>
        <article className="card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"><h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.lostStatus')}</h2><StatusPieChart data={analytics.lostStatusBreakdown} labelMap={statusLabelMap} emptyText={t('analytics.chartEmptyStatus')} /></article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"><h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.foundStatus')}</h2><StatusPieChart data={analytics.foundStatusBreakdown} labelMap={statusLabelMap} emptyText={t('analytics.chartEmptyStatus')} /></article>
        <article className="card space-y-3 border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 lg:col-span-2"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.insights')}</h2><p>{t('analytics.insightRecovery', { rate: recoveryRate })}</p><p>{t('analytics.insightVolume')}</p><p>{t('analytics.insightStatus')}</p></article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label={t('analytics.hotspotsRecommendations')}>
        <article className="card border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><MapPin aria-hidden="true" className="h-5 w-5 text-rose-500" />{t('analytics.hotspots')}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">{[[t('analytics.locations'), intelligence.hotspots.locations], [t('analytics.categories'), intelligence.hotspots.categories], [t('analytics.times'), intelligence.hotspots.times]].map(([title, items]) => <div key={title}><h3 className="text-sm font-bold">{title}</h3>{items?.length ? <ol className="mt-2 space-y-2 text-sm">{items.map((item) => <li key={item.label} className="flex justify-between gap-3"><span>{item.label}</span><strong>{item.count}</strong></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">{t('analytics.noHotspots')}</p>}</div>)}</div>
          <p className="mt-4 text-xs text-slate-500">{t('analytics.hotspotPrivacy')}</p>
        </article>
        <article className="card border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><Lightbulb aria-hidden="true" className="h-5 w-5 text-amber-600" />{t('analytics.recommendations')}</h2><p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-100">{t('analytics.recommendationNotice')}</p>
          {intelligence.recommendations.items?.length ? <ul className="mt-4 space-y-3">{intelligence.recommendations.items.map((item, index) => <li key={`${item.type}-${index}`} className="rounded-xl border border-amber-200 bg-white/80 p-3 text-sm dark:border-amber-900/60 dark:bg-slate-900/70"><span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{t(`analytics.confidence.${item.confidence}`, undefined, item.confidence)}</span><p className="mt-1">{renderRecommendation(item)}</p></li>)}</ul> : <p className="mt-4 text-sm">{t('analytics.noRecommendations')}</p>}
        </article>
      </section>

      <section className="card border border-sky-200 bg-sky-50/70 p-6 dark:border-sky-900/50 dark:bg-sky-950/20" aria-labelledby="historical-cohorts-title">
        <h2 id="historical-cohorts-title" className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><TrendingUp aria-hidden="true" className="h-5 w-5 text-sky-600" />{t('analytics.cohorts')}</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t('analytics.cohortNotice')}</p><p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">{predictionNotice}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2"><CohortList title={t('analytics.categoryCohorts')} cohorts={intelligence.predictions.categoryCohorts} /><CohortList title={t('analytics.locationCohorts')} cohorts={intelligence.predictions.locationCohorts} /></div>
      </section>
    </div>
  );
};

export default Analytics;
