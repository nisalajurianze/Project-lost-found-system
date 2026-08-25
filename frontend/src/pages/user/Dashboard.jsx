import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiCheckSquare,
  FiDownload,
  FiPackage,
  FiPlusCircle,
  FiPlusSquare,
  FiSearch,
  FiShare,
  FiShield,
  FiZap,
} from 'react-icons/fi';
import MatchCard from '../../components/cards/MatchCard';
import ProfileCompletionModal from '../../components/modals/ProfileCompletionModal';
import api from '../../services/api';
import matchService from '../../services/matchService';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { PUSH_NOTIFICATION_ERROR_CODES, subscribeToPushNotifications } from '../../utils/pushNotifications';
import { useLanguage } from '../../i18n/LanguageContext';

const MetricCard = ({ label, value, icon: Icon, to }) => (
  <Link to={to} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 dark:border-surface-800 dark:bg-surface-900">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-sm text-surface-500">{label}</p><p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{value}</p></div>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"><Icon size={22} /></span>
    </div>
  </Link>
);

const AttentionCard = ({ label, value, description, to, urgent = false }) => (
  <Link to={to} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${urgent && value > 0 ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100' : 'border-surface-200 bg-white text-surface-900 dark:border-surface-800 dark:bg-surface-900 dark:text-white'}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-semibold">{label}</p><p className="mt-1 text-sm opacity-75">{description}</p></div>
      <span className="text-2xl font-extrabold" aria-label={`${value} ${label}`}>{value}</span>
    </div>
  </Link>
);

const QuickAction = ({ to, icon: Icon, label, description }) => (
  <Link to={to} className="flex min-h-20 items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 transition hover:border-primary-400 dark:border-surface-800 dark:bg-surface-900">
    <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"><Icon size={20} /></span>
    <span className="min-w-0 flex-1"><span className="block font-semibold text-surface-900 dark:text-white">{label}</span><span className="block text-sm text-surface-500">{description}</span></span>
    <FiArrowRight aria-hidden="true" />
  </Link>
);

export const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaims: 0,
    successfulRecoveries: 0,
    attention: { suggestedMatches: 0, pendingClaims: 0, claimsAwaitingReview: 0, handoverPending: 0, activeReports: 0, total: 0 },
  });
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') setShowPushPrompt(true);
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, matchResponse] = await Promise.all([
        api.get('/users/stats'),
        matchService.getMatches('suggested'),
      ]);
      setStats(statsResponse.data.data);
      const list = Array.isArray(matchResponse) ? matchResponse : (matchResponse.matches || []);
      setMatches(list.slice(0, 3));
    } catch {
      toast.error(t('dashboard.refreshError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30_000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') toast.success(t('dashboard.installSuccess'));
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleEnablePush = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) { setShowIosPrompt(true); return; }
    try {
      await subscribeToPushNotifications();
      toast.success(t('dashboard.pushSuccess'));
      setShowPushPrompt(false);
    } catch (error) {
      const errorKey = error?.code === PUSH_NOTIFICATION_ERROR_CODES.UNSUPPORTED
        ? 'notifications.pushUnsupported'
        : error?.code === PUSH_NOTIFICATION_ERROR_CODES.PERMISSION_DENIED
          ? 'notifications.pushDenied'
          : 'notifications.pushSetupFailed';
      toast.error(t(errorKey));
    }
  };

  const handleMatchConfirm = async (id) => {
    try {
      await matchService.updateMatchStatus(id, 'confirmed');
      toast.success(t('dashboard.matchConfirmSuccess'));
      fetchDashboardData();
    } catch { toast.error(t('dashboard.matchConfirmError')); }
  };

  const handleMatchReject = async (id) => {
    try {
      await matchService.updateMatchStatus(id, 'rejected');
      toast.success(t('dashboard.matchRejectSuccess'));
      fetchDashboardData();
    } catch { toast.error(t('dashboard.matchRejectError')); }
  };

  if (isLoading) return <Loader fullPage />;

  const firstName = user?.fullName?.split(' ')[0] || t('dashboard.fallbackName');
  const attention = stats.attention || {};

  return (
    <div className="space-y-7 animate-fade-in">
      <header className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-700 to-indigo-800 p-6 text-white shadow-lg dark:border-primary-900">
        <p className="text-sm font-semibold text-primary-100">{t('dashboard.welcome', { name: firstName })}</p>
        <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><h1 className="text-3xl font-extrabold">{t('dashboard.heroTitle')}</h1><p className="mt-2 max-w-2xl text-primary-100">{t('dashboard.heroDesc')}</p></div>
          <div className="flex flex-wrap gap-3"><Link to="/dashboard/report-lost" className="btn btn-md bg-white text-primary-800 hover:bg-primary-50"><FiPlusCircle /> {t('nav.reportLost')}</Link><Link to="/dashboard/report-found" className="btn btn-md border border-white/50 bg-white/10 text-white hover:bg-white/20"><FiPackage /> {t('nav.reportFound')}</Link></div>
        </div>
      </header>

      <section aria-labelledby="attention-title">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="attention-title" className="text-xl font-bold text-surface-900 dark:text-white">{t('dashboard.needsAttention')}</h2><p className="text-sm text-surface-500">{t('dashboard.attentionDesc')}</p></div>{attention.total > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{t('dashboard.open', { count: attention.total })}</span>}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AttentionCard label={t('dashboard.potentialMatches')} value={attention.suggestedMatches || 0} description={t('dashboard.reviewSuggestions')} to="/dashboard/my-matches" urgent />
          <AttentionCard label={t('dashboard.claimsToReview')} value={attention.claimsAwaitingReview || 0} description={t('dashboard.claimsToReviewDesc')} to="/dashboard/claims" urgent />
          <AttentionCard label={t('dashboard.pendingClaims')} value={attention.pendingClaims || 0} description={t('dashboard.pendingClaimsDesc')} to="/dashboard/claims" />
          <AttentionCard label={t('dashboard.handoverPending')} value={attention.handoverPending || 0} description={t('dashboard.handoverDesc')} to="/dashboard/claims" urgent />
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 text-xl font-bold text-surface-900 dark:text-white">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/search" icon={FiSearch} label={t('dashboard.searchReports')} description={t('dashboard.searchReportsDesc')} />
          <QuickAction to="/dashboard/report-lost" icon={FiPlusCircle} label={t('nav.reportLost')} description={t('dashboard.reportLostDesc')} />
          <QuickAction to="/dashboard/report-found" icon={FiPackage} label={t('nav.reportFound')} description={t('dashboard.reportFoundDesc')} />
          <QuickAction to="/dashboard/my-matches" icon={FiActivity} label={t('dashboard.reviewMatches')} description={t('dashboard.reviewMatchesDesc')} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('dashboard.accountTotals')}>
        <MetricCard label={t('dashboard.lostReports')} value={stats.totalLostItems} icon={FiSearch} to="/dashboard/my-lost" />
        <MetricCard label={t('dashboard.foundReports')} value={stats.totalFoundItems} icon={FiPackage} to="/dashboard/my-found" />
        <MetricCard label={t('dashboard.submittedClaims')} value={stats.totalClaims} icon={FiCheckSquare} to="/dashboard/claims" />
        <MetricCard label={t('dashboard.recoveredItems')} value={stats.successfulRecoveries} icon={FiShield} to="/dashboard/claims" />
      </section>

      <section aria-labelledby="matches-title" className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div className="mb-4 flex items-center justify-between"><div><h2 id="matches-title" className="text-xl font-bold text-surface-900 dark:text-white">{t('dashboard.potentialMatches')}</h2><p className="text-sm text-surface-500">{t('dashboard.matchesDesc')}</p></div><Link to="/dashboard/my-matches" className="text-sm font-semibold text-primary-700 dark:text-primary-300">{t('common.viewAll')}</Link></div>
        {matches.length === 0 ? <div className="rounded-xl bg-surface-50 p-6 text-center dark:bg-surface-950/40"><p className="font-semibold">{t('dashboard.noSuggestions')}</p><p className="mt-1 text-sm text-surface-500">{t('dashboard.noSuggestionsDesc')}</p></div> : <div className="space-y-4">{matches.map((match) => <MatchCard key={match._id} match={match} onConfirm={handleMatchConfirm} onReject={handleMatchReject} />)}</div>}
      </section>

      {(showInstallPrompt || showPushPrompt || !user?.phone || !user?.studentId) && (
        <section aria-labelledby="optional-setup-title" className="space-y-3">
          <h2 id="optional-setup-title" className="text-lg font-bold text-surface-900 dark:text-white">{t('dashboard.optionalSetup')}</h2>
          {(!user?.phone || !user?.studentId) && <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-900/50 dark:bg-amber-950/30"><div className="flex gap-3"><FiAlertTriangle className="mt-1 flex-none text-amber-600" /><div><p className="font-semibold">{t('dashboard.profileSetupTitle')}</p><p className="text-sm opacity-75">{t('dashboard.profileSetupDesc')}</p></div></div><button type="button" onClick={() => setIsProfileModalOpen(true)} className="btn btn-primary btn-md">{t('dashboard.profileSetupAction')}</button></div>}
          {showInstallPrompt && <div className="flex flex-col justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:flex-row sm:items-center dark:border-surface-800 dark:bg-surface-900"><div className="flex gap-3"><FiDownload className="mt-1 flex-none text-primary-600" /><div><p className="font-semibold">{t('dashboard.installTitle')}</p><p className="text-sm text-surface-500">{t('dashboard.installDesc')}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => setShowInstallPrompt(false)} className="btn btn-ghost btn-md">{t('dashboard.notNow')}</button><button type="button" onClick={handleInstallApp} className="btn btn-primary btn-md">{t('dashboard.installAction')}</button></div></div>}
          {showPushPrompt && <div className="flex flex-col justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:flex-row sm:items-center dark:border-surface-800 dark:bg-surface-900"><div className="flex gap-3"><FiZap className="mt-1 flex-none text-primary-600" /><div><p className="font-semibold">{t('dashboard.pushTitle')}</p><p className="text-sm text-surface-500">{t('dashboard.pushDesc')}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => setShowPushPrompt(false)} className="btn btn-ghost btn-md">{t('dashboard.notNow')}</button><button type="button" onClick={handleEnablePush} className="btn btn-primary btn-md">{t('dashboard.enableAction')}</button></div></div>}
        </section>
      )}

      <ProfileCompletionModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      <Modal isOpen={showIosPrompt} onClose={() => setShowIosPrompt(false)} title={t('dashboard.iosTitle')} closeLabel={t('dashboard.iosClose')} size="sm">
        <p className="text-sm text-surface-500">{t('dashboard.iosDesc')}</p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-2"><FiShare aria-hidden="true" className="mt-0.5" /> {t('dashboard.iosStep1')}</li>
          <li className="flex gap-2"><FiPlusSquare aria-hidden="true" className="mt-0.5" /> {t('dashboard.iosStep2')}</li>
          <li className="flex gap-2"><FiZap aria-hidden="true" className="mt-0.5" /> {t('dashboard.iosStep3')}</li>
        </ol>
        <Button type="button" onClick={() => setShowIosPrompt(false)} className="mt-5 w-full">{t('dashboard.done')}</Button>
      </Modal>
    </div>
  );
};

export default Dashboard;
