import React, { useEffect, useState, useCallback } from 'react';
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
  AlertTriangle,
  Clock3,
  ListChecks,
  ShieldAlert,
  DatabaseZap,
  RefreshCw,
  Sparkles,
  MapPin,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import StatCard from '../../components/cards/StatCard';
import Loader from '../../components/common/Loader';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import adminService from '../../services/adminService';
import { useLanguage } from '../../i18n/LanguageContext';

const MonthlyReportsChart = lazyWithRetry(() => import('../../components/charts/MonthlyReportsChart'));
const StatusPieChart = lazyWithRetry(() => import('../../components/charts/StatusPieChart'));

export const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const { stats, isLoading, error } = useSelector((state) => state.admin);
  const [aiHealth, setAIHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchAdminStats()).unwrap(),
        adminService.getAIHealth().then((data) => setAIHealth(data)).catch(() => setAIHealth(null)),
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

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
      icon: <ListChecks className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />,
      value: operations.pendingClaims,
      title: t('admin.pendingClaims'),
      description: t('admin.olderThan48', { count: operations.overdueClaims }),
      border: 'border-violet-200 dark:border-violet-900/40 hover:border-violet-400',
    },
    {
      to: '/admin/matches?status=suggested',
      icon: <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
      value: operations.strongSuggestedMatches,
      title: t('admin.strongMatches'),
      description: t('admin.awaitingHuman'),
      border: 'border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400',
    },
    {
      to: '/admin/claims',
      icon: <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
      value: operations.overdueHandovers,
      title: t('admin.overdueHandovers'),
      description: t('admin.connectedOver48'),
      border: 'border-amber-200 dark:border-amber-900/40 hover:border-amber-400',
    },
    {
      to: '/admin/logs',
      icon: <DatabaseZap className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />,
      value: operations.deadOutboxEvents,
      title: t('admin.failedJobs'),
      description: t('admin.deadOutbox'),
      border: 'border-rose-200 dark:border-rose-900/40 hover:border-rose-400',
    },
  ];

  const reviewRows = [
    { to: '/admin/claims?status=pending', icon: <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />, label: t('admin.weakEvidence'), value: operations.weakEvidenceClaims },
    { to: '/admin/logs', icon: <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />, label: t('admin.privacyReview'), value: operations.privacyReviewItems },
    { to: '/admin/ai-feedback', icon: <BrainCircuit className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />, label: t('admin.correctionsReview'), value: operations.pendingAIFeedback },
    { to: '/admin/claims?risk=review', icon: <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />, label: t('admin.claimRiskReview'), value: operations.highRiskClaims },
  ];

  const quickShortcuts = [
    { to: '/admin/users', title: t('admin.manageUsers'), icon: <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />, desc: 'Roles & Status' },
    { to: '/admin/lost-items', title: t('admin.manageLost'), icon: <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />, desc: 'Lost Reports' },
    { to: '/admin/found-items', title: t('admin.manageFound'), icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />, desc: 'Found Items' },
    { to: '/admin/categories', title: t('admin.manageCategories'), icon: <PlusCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />, desc: 'Item Taxonomy' },
    { to: '/admin/locations', title: t('admin.locationKnowledge'), icon: <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />, desc: 'SEUSL Geo Maps' },
    { to: '/admin/logs', title: t('admin.auditLogs'), icon: <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />, desc: 'Security Audit' },
  ];

  const timeFormatted = lastUpdated.toLocaleTimeString(language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header & Live Status */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200/60 dark:border-surface-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Shield className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              {t('admin.dashboardTitle')}
            </h1>
          </div>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 pl-0.5">
            {t('admin.dashboardSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/50 text-xs font-medium text-surface-600 dark:text-surface-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SEUSL Live • {timeFormatted}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700/60 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('admin.dashboardLoadError', { error })}</span>
        </div>
      )}

      {/* Urgent Operational Attention Queue */}
      <section
        aria-labelledby="urgent-attention-title"
        className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-surface-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-amber-500/5 dark:from-amber-950/40 dark:via-surface-900/90 dark:to-surface-950"
      >
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 opacity-80" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0 shadow-inner">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="urgent-attention-title" className="text-lg sm:text-xl font-black tracking-tight text-amber-950 dark:text-amber-100 flex items-center gap-2">
                {t('admin.urgentTitle')}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-amber-800/80 dark:text-amber-200/75">
                {t('admin.urgentDesc')}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-black border transition-all duration-300 ${
            operations.urgentTotal > 0
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          }`}>
            <span className={`h-2 w-2 rounded-full ${operations.urgentTotal > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            {t('admin.urgentCount', { count: operations.urgentTotal })}
          </span>
        </div>

        {/* 4 Primary Queue Cards */}
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {urgentCards.map((card) => {
            const hasItems = card.value > 0;
            return (
              <Link
                key={card.to + card.title}
                to={card.to}
                className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  hasItems
                    ? 'border-violet-500/40 bg-gradient-to-b from-violet-500/15 via-violet-500/5 to-white/90 dark:to-surface-900/95 shadow-md shadow-violet-500/10'
                    : 'border-surface-200/80 dark:border-surface-800/80 bg-white/70 dark:bg-surface-900/60 hover:border-surface-300 dark:hover:border-surface-700'
                }`}
              >
                {hasItems && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-indigo-600" />
                )}
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                    hasItems
                      ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-xs'
                      : 'bg-surface-100 dark:bg-surface-800/80 text-surface-500 dark:text-surface-400'
                  }`}>
                    {card.icon}
                  </div>
                  <span className={`text-3xl font-black tracking-tight ${
                    hasItems
                      ? 'text-violet-700 dark:text-violet-300 drop-shadow-xs'
                      : 'text-surface-400 dark:text-surface-500'
                  }`}>
                    {card.value}
                  </span>
                </div>
                <p className="mt-3.5 font-bold text-sm text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {card.title}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Review Queues Rows */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {reviewRows.map((row) => (
            <Link
              key={row.to + row.label}
              to={row.to}
              className="group flex items-center justify-between rounded-xl border border-amber-500/20 bg-white/70 dark:bg-surface-900/70 px-4 py-2.5 text-xs sm:text-sm hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all duration-200 shadow-2xs"
            >
              <span className="flex items-center gap-2.5 text-surface-700 dark:text-surface-300 font-medium group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
                <span className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  {row.icon}
                </span>
                {row.label}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800/90 text-surface-900 dark:text-white font-bold border border-surface-200 dark:border-surface-700/60 shadow-2xs group-hover:border-primary-500/40 transition-colors">
                {row.value}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Telemetry & Health Subsystem */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('admin.aiHealth')}>
        <div className="group rounded-2xl border border-surface-200/70 bg-gradient-to-b from-white/90 to-surface-50/50 dark:from-surface-900/90 dark:to-surface-950/90 p-4 sm:p-5 backdrop-blur-md shadow-sm hover:border-violet-500/30 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400"><BrainCircuit className="h-4 w-4" aria-hidden="true" /></span>
              <span>{t('admin.aiProvider')}</span>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${aiHealth?.configured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            {aiHealth?.configured ? t('admin.configured') : t('admin.fallbackMode')}
          </p>
          <div className="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 flex items-center justify-between">
            <span>{t('admin.vision')}:</span>
            <strong className="text-surface-800 dark:text-surface-200 font-semibold">{aiHealth?.visionConfigured ? t('admin.ready') : t('admin.manualFallback')}</strong>
          </div>
        </div>

        <div className="group rounded-2xl border border-surface-200/70 bg-gradient-to-b from-white/90 to-surface-50/50 dark:from-surface-900/90 dark:to-surface-950/90 p-4 sm:p-5 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Wifi className="h-4 w-4" aria-hidden="true" /></span>
              <span>{t('admin.providerSuccess')}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">Healthy</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            {aiHealth?.successRate ?? 0}%
          </p>
          <div className="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 flex items-center justify-between">
            <span>Latency:</span>
            <strong className="text-surface-800 dark:text-surface-200 font-mono font-semibold">{aiHealth?.averageLatencyMs ?? 0}ms</strong>
          </div>
        </div>

        <div className="group rounded-2xl border border-surface-200/70 bg-gradient-to-b from-white/90 to-surface-50/50 dark:from-surface-900/90 dark:to-surface-950/90 p-4 sm:p-5 backdrop-blur-md shadow-sm hover:border-amber-500/30 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></span>
              <span>{t('admin.safeFallbacks')}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">Zero Downtime</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            {aiHealth?.fallbackUses ?? 0}
          </p>
          <div className="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 flex items-center justify-between">
            <span>{t('admin.lastFailure', { value: '' })}</span>
            <strong className="text-surface-800 dark:text-surface-200 font-mono text-[11px] truncate max-w-[120px]">{aiHealth?.lastFailureCode || t('admin.noneRecorded')}</strong>
          </div>
        </div>

        <div className="group rounded-2xl border border-surface-200/70 bg-gradient-to-b from-white/90 to-surface-50/50 dark:from-surface-900/90 dark:to-surface-950/90 p-4 sm:p-5 backdrop-blur-md shadow-sm hover:border-cyan-500/30 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><ListChecks className="h-4 w-4" aria-hidden="true" /></span>
              <span>{t('admin.aiEvaluations')}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">{aiHealth?.evaluations?.datasetVersion || 'golden-v1'}</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            {aiHealth?.evaluations?.passRate ?? 0}%
          </p>
          <div className="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 flex items-center justify-between gap-3">
            <span>{t('admin.evalCases', { value: aiHealth?.evaluations?.total ?? 0 })}</span>
            <strong className="text-surface-800 dark:text-surface-200 font-semibold">{t('admin.safetyRejections')}: {aiHealth?.safetyRejections ?? 0}</strong>
          </div>
        </div>
      </section>

      {/* KPI Core Statistics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label={t('admin.dashboardTitle')}>
        <StatCard icon={<Users className="h-6 w-6 text-blue-500 dark:text-blue-400" aria-hidden="true" />} title={t('admin.totalUsers')} value={summary.totalUsers} color="blue" />
        <StatCard icon={<HelpCircle className="h-6 w-6 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />} title={t('admin.lostReports')} value={summary.totalLostItems} color="indigo" />
        <StatCard icon={<CheckCircle className="h-6 w-6 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />} title={t('admin.foundListings')} value={summary.totalFoundItems} color="emerald" />
        <StatCard icon={<FileText className="h-6 w-6 text-purple-500 dark:text-purple-400" aria-hidden="true" />} title={t('admin.recoveryRate')} value={`${recoveryRate}%`} color="purple" />
      </section>

      {/* Successful Handbacks Milestone Banner */}
      <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-950 dark:via-teal-900/90 dark:to-emerald-900/90 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-lg shadow-emerald-500/10 border border-emerald-400/20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20 shadow-inner">
            <Sparkles className="h-7 w-7 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest">{t('admin.successfulHandbacks')}</p>
            <p className="text-3xl sm:text-4xl font-black mt-0.5 text-white tracking-tight">{summary.successfulRecoveries} Items Returned</p>
          </div>
        </div>
        <Link
          aria-label={t('admin.viewHandbacks')}
          to="/admin/found-items?status=claimed"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm rounded-xl shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span>View Verified Handbacks</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {/* Analytics Charts & Status Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-surface-100 dark:border-surface-700/50">
            <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400"><Activity className="h-5 w-5" aria-hidden="true" /></span>
              {t('admin.monthlyComparison')}
            </h2>
            <span className="text-xs text-surface-500 flex items-center gap-1 font-medium"><TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Monthly Trend</span>
          </div>
          <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-surface-50 dark:bg-surface-800 rounded-xl"><Loader /></div>}>
            <MonthlyReportsChart monthlyLost={analytics.monthlyLost} monthlyFound={analytics.monthlyFound} />
          </React.Suspense>
        </div>

        <div className="card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-surface-100 dark:border-surface-700/50">
            <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400"><Grid className="h-5 w-5" aria-hidden="true" /></span>
              {t('admin.lostStatuses')}
            </h2>
            <span className="text-xs text-surface-500 flex items-center gap-1 font-medium"><Layers className="h-3.5 w-3.5 text-purple-500" /> Status Share</span>
          </div>
          <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-surface-50 dark:bg-surface-800 rounded-xl"><Loader /></div>}>
            <StatusPieChart data={analytics.lostStatusBreakdown} />
          </React.Suspense>
        </div>
      </section>

      {/* Quick Administrative Shortcuts */}
      <section className="card bg-white dark:bg-surface-900/60 border border-surface-200/80 dark:border-surface-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary-500" aria-hidden="true" />
          {t('admin.quickShortcuts')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickShortcuts.map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="p-3.5 rounded-xl border border-surface-200/70 dark:border-surface-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-1.5 group"
            >
              <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 group-hover:scale-110 transition-transform shadow-xs">
                {shortcut.icon}
              </div>
              <span className="text-xs font-bold text-surface-800 dark:text-surface-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                {shortcut.title}
              </span>
              <span className="text-[10px] text-surface-400 dark:text-surface-500 line-clamp-1">{shortcut.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
