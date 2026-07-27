import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Users,
  HelpCircle,
  CheckCircle,
  FileText,
  PlusCircle,
  ArrowRight,
  Shield,
  Activity,
  Grid,
  BrainCircuit,
  Wifi,
  TriangleAlert,
  Clock3,
  ListChecks,
  ShieldAlert,
  DatabaseZap,
} from 'lucide-react';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import StatCard from '../../components/cards/StatCard';
import Loader from '../../components/common/Loader';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import adminService from '../../services/adminService';
import { useLanguage } from '../../i18n/LanguageContext';

const MonthlyReportsChart = lazyWithRetry(() => import('../../components/charts/MonthlyReportsChart'));
const StatusPieChart = lazyWithRetry(() => import('../../components/charts/StatusPieChart'));

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { stats, isLoading, error } = useSelector((state) => state.admin);
  const [aiHealth, setAIHealth] = useState(null);

  useEffect(() => { dispatch(fetchAdminStats()); }, [dispatch]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await adminService.getAIHealth();
        if (active) setAIHealth(data);
      } catch {
        if (active) setAIHealth(null);
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  if (isLoading && !stats) return <Loader fullScreen />;

  const summary = stats?.summary || {
    totalUsers: 0,
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaims: 0,
    successfulRecoveries: 0,
    pendingClaims: 0,
  };
  const analytics = stats?.analytics || {
    monthlyLost: [],
    monthlyFound: [],
    lostStatusBreakdown: {},
    foundStatusBreakdown: {},
  };
  const operations = stats?.operations || {
    pendingClaims: 0,
    overdueClaims: 0,
    strongSuggestedMatches: 0,
    overdueHandovers: 0,
    deadOutboxEvents: 0,
    weakEvidenceClaims: 0,
    highRiskClaims: 0,
    pendingAIFeedback: 0,
    privacyReviewItems: 0,
    urgentTotal: 0,
  };
  const recoveryRate = summary.totalLostItems > 0
    ? Math.round((summary.successfulRecoveries / summary.totalLostItems) * 100)
    : 0;

  const urgentCards = [
    {
      to: '/admin/claims?status=pending',
      icon: <ListChecks className="h-5 w-5 text-violet-600" aria-hidden="true" />,
      value: operations.pendingClaims,
      title: t('admin.pendingClaims'),
      description: t('admin.olderThan48', { count: operations.overdueClaims }),
    },
    {
      to: '/admin/matches?status=suggested',
      icon: <BrainCircuit className="h-5 w-5 text-indigo-600" aria-hidden="true" />,
      value: operations.strongSuggestedMatches,
      title: t('admin.strongMatches'),
      description: t('admin.awaitingHuman'),
    },
    {
      to: '/admin/claims',
      icon: <Clock3 className="h-5 w-5 text-orange-600" aria-hidden="true" />,
      value: operations.overdueHandovers,
      title: t('admin.overdueHandovers'),
      description: t('admin.connectedOver48'),
    },
    {
      to: '/admin/logs',
      icon: <DatabaseZap className="h-5 w-5 text-red-600" aria-hidden="true" />,
      value: operations.deadOutboxEvents,
      title: t('admin.failedJobs'),
      description: t('admin.deadOutbox'),
    },
  ];

  const reviewRows = [
    { to: '/admin/claims?status=pending', icon: <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />, label: t('admin.weakEvidence'), value: operations.weakEvidenceClaims },
    { to: '/admin/logs', icon: <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />, label: t('admin.privacyReview'), value: operations.privacyReviewItems },
    { to: '/admin/ai-feedback', icon: <BrainCircuit className="h-4 w-4 text-violet-600" aria-hidden="true" />, label: t('admin.correctionsReview'), value: operations.pendingAIFeedback },
    { to: '/admin/claims?risk=review', icon: <ShieldAlert className="h-4 w-4 text-orange-600" aria-hidden="true" />, label: t('admin.claimRiskReview'), value: operations.highRiskClaims },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          {t('admin.dashboardTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('admin.dashboardSubtitle')}</p>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          {t('admin.dashboardLoadError', { error })}
        </div>
      )}

      <section aria-labelledby="urgent-attention-title" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="urgent-attention-title" className="flex items-center gap-2 text-xl font-bold text-amber-950 dark:text-amber-100">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" /> {t('admin.urgentTitle')}
            </h2>
            <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/70">{t('admin.urgentDesc')}</p>
          </div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-extrabold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
            {t('admin.urgentCount', { count: operations.urgentTotal })}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {urgentCards.map((card) => (
            <Link key={card.to} to={card.to} className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-surface-900">
              <div className="flex items-center justify-between">{card.icon}<span className="text-2xl font-extrabold">{card.value}</span></div>
              <p className="mt-2 font-semibold">{card.title}</p>
              <p className="text-sm text-surface-500">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {reviewRows.map((row) => (
            <Link key={row.to + row.label} to={row.to} className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-surface-900">
              <span className="flex items-center gap-2">{row.icon}{row.label}</span>
              <strong>{row.value}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label={t('admin.aiHealth')}>
        <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-surface-600 dark:text-surface-300"><BrainCircuit className="h-5 w-5 text-violet-600" aria-hidden="true" />{t('admin.aiProvider')}</div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{aiHealth?.configured ? t('admin.configured') : t('admin.fallbackMode')}</p>
          <p className="mt-1 text-sm text-surface-500">{t('admin.vision')}: {aiHealth?.visionConfigured ? t('admin.ready') : t('admin.manualFallback')}</p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-surface-600 dark:text-surface-300"><Wifi className="h-5 w-5 text-emerald-600" aria-hidden="true" />{t('admin.providerSuccess')}</div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{aiHealth?.successRate ?? 0}%</p>
          <p className="mt-1 text-sm text-surface-500">{t('admin.averageLatency', { value: aiHealth?.averageLatencyMs ?? 0 })}</p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-surface-600 dark:text-surface-300"><TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />{t('admin.safeFallbacks')}</div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{aiHealth?.fallbackUses ?? 0}</p>
          <p className="mt-1 text-sm text-surface-500">{t('admin.lastFailure', { value: aiHealth?.lastFailureCode || t('admin.noneRecorded') })}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label={t('admin.dashboardTitle')}>
        <StatCard icon={<Users className="h-7 w-7 text-blue-500 dark:text-blue-400" aria-hidden="true" />} title={t('admin.totalUsers')} value={summary.totalUsers} color="blue" />
        <StatCard icon={<HelpCircle className="h-7 w-7 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />} title={t('admin.lostReports')} value={summary.totalLostItems} color="indigo" />
        <StatCard icon={<CheckCircle className="h-7 w-7 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />} title={t('admin.foundListings')} value={summary.totalFoundItems} color="emerald" />
        <StatCard icon={<FileText className="h-7 w-7 text-purple-500 dark:text-purple-400" aria-hidden="true" />} title={t('admin.recoveryRate')} value={`${recoveryRate}%`} color="purple" />
      </section>

      <section className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-900/80 dark:to-teal-900/80 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-emerald-500/20">
        <div>
          <p className="text-sm font-semibold text-emerald-50 dark:text-emerald-200 uppercase tracking-widest">{t('admin.successfulHandbacks')}</p>
          <p className="text-4xl font-extrabold mt-2 text-white">{summary.successfulRecoveries}</p>
        </div>
        <Link aria-label={t('admin.viewHandbacks')} to="/admin/found-items?status=claimed" className="min-h-11 min-w-11 p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm">
          <ArrowRight className="h-6 w-6" aria-hidden="true" />
        </Link>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2.5 mb-6">
            <span className="p-2 bg-indigo-500/10 rounded-lg"><Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /></span>
            {t('admin.monthlyComparison')}
          </h2>
          <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-surface-50 dark:bg-surface-800 rounded-xl"><Loader /></div>}>
            <MonthlyReportsChart monthlyLost={analytics.monthlyLost} monthlyFound={analytics.monthlyFound} />
          </React.Suspense>
        </div>
        <div className="card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-6 text-surface-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 bg-purple-500/10 rounded-lg"><Grid className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" /></span>
            {t('admin.lostStatuses')}
          </h2>
          <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-surface-50 dark:bg-surface-800 rounded-xl"><Loader /></div>}>
            <StatusPieChart data={analytics.lostStatusBreakdown} />
          </React.Suspense>
        </div>
      </section>

      <section className="card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('admin.quickShortcuts')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link to="/admin/users" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2">
            <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.manageUsers')}</span>
          </Link>
          <Link to="/admin/categories" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2">
            <PlusCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.manageCategories')}</span>
          </Link>
          <Link to="/admin/logs" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2">
            <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.systemLogs')}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
