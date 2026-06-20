// ============================================
// Student Dashboard Page Component
// Premium redesign with glassmorphism & animations
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiPlusCircle, FiPackage, FiActivity, FiCheckSquare,
  FiSearch, FiZap, FiArrowRight, FiTrendingUp,
  FiMapPin, FiClock, FiStar, FiShield, FiShare, FiPlusSquare, FiX, FiDownload, FiAlertTriangle
} from 'react-icons/fi';
import MatchCard from '../../components/cards/MatchCard';
import ProfileCompletionModal from '../../components/modals/ProfileCompletionModal';
import api from '../../services/api';
import matchService from '../../services/matchService';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { subscribeToPushNotifications } from '../../utils/pushNotifications';

// Animated number counter
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

// Premium Stat Card
const PremiumStatCard = ({ title, value, icon: Icon, gradient, delay = 0, to }) => {
  const content = (
    <>
      <div className="premium-stat-inner">
        <div className="premium-stat-icon" style={{ background: gradient }}>
          <Icon size={22} />
        </div>
        <div className="premium-stat-info">
          <p className="premium-stat-label">{title}</p>
          <h3 className="premium-stat-value">
            <AnimatedNumber value={value} />
          </h3>
        </div>
      </div>
      <div className="premium-stat-glow" style={{ background: gradient }} />
    </>
  );

  return to ? (
    <Link
      to={to}
      className="premium-stat-card block transition-all hover:scale-[1.02]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {content}
    </Link>
  ) : (
    <div
      className="premium-stat-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      {content}
    </div>
  );
};

// Quick Action Card
const QuickActionCard = ({ to, icon: Icon, label, description, gradient, delay = 0 }) => (
  <Link
    to={to}
    className="quick-action-card"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="quick-action-icon" style={{ background: gradient }}>
      <Icon size={20} />
    </div>
    <div className="quick-action-text">
      <span className="quick-action-label">{label}</span>
      <span className="quick-action-desc">{description}</span>
    </div>
    <FiArrowRight className="quick-action-arrow" size={16} />
  </Link>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [stats, setStats] = useState({
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaims: 0,
    successfulRecoveries: 0
  });
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // App Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowPushPrompt(true);
    }

    // Listen for PWA Install Prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed successfully!');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleEnablePush = async () => {
    // iOS Safari Web Push requires PWA (Add to Home Screen)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setShowIosPrompt(true);
      return;
    }

    try {
      await subscribeToPushNotifications();
      toast.success('Push notifications enabled!');
      setShowPushPrompt(false);
    } catch (err) {
      toast.error('Could not enable push notifications. Check browser settings.');
      console.error(err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/users/stats');
      setStats(statsRes.data.data);
      const matchesData = await matchService.getMatches('suggested');
      // Fix: Handle cases where backend returns paginated object { matches, pagination }
      const matchesArray = Array.isArray(matchesData) ? matchesData : (matchesData.matches || []);
      setMatches(matchesArray.slice(0, 2));
    } catch (err) {
      console.error('Failed to load student dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const handleMatchConfirm = async (id) => {
    try {
      await matchService.updateMatchStatus(id, 'confirmed');
      toast.success('Match confirmed! File a claim request.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm match.');
    }
  };

  const handleMatchReject = async (id) => {
    try {
      await matchService.updateMatchStatus(id, 'rejected');
      toast.success('Match discarded.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to discard match.');
    }
  };

  if (isLoading) return <Loader fullPage />;

  const firstName = user?.fullName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="dashboard-premium">
      {/* ── App Install Prompt (Android/Chrome) ── */}
      {showInstallPrompt && (
        <div className="bg-primary-900/40 border border-primary-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 text-primary-400 rounded-full">
              <FiDownload size={20} />
            </div>
            <div>
              <h4 className="text-white font-medium">Install App</h4>
              <p className="text-sm text-surface-300">Add Smart L&F to your home screen for a faster, app-like experience!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInstallPrompt(false)} className="px-4 py-2 text-sm text-surface-300 hover:text-white transition-colors">Not Now</button>
            <button onClick={handleInstallApp} className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg shadow-primary-900/50 transition-all font-medium">Install</button>
          </div>
        </div>
      )}

      {/* ── Push Notification Prompt ── */}
      {showPushPrompt && !showIosPrompt && (
        <div className="bg-primary-900/40 border border-primary-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 text-primary-400 rounded-full">
              <FiZap size={20} />
            </div>
            <div>
              <h4 className="text-white font-medium">Enable Push Notifications</h4>
              <p className="text-sm text-surface-300">Get instantly notified when we find a match or your claim updates!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPushPrompt(false)} className="px-4 py-2 text-sm text-surface-300 hover:text-white transition-colors">Not Now</button>
            <button onClick={handleEnablePush} className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg shadow-primary-900/50 transition-all font-medium">Enable</button>
          </div>
        </div>
      )}

      {/* ── Profile Incomplete Banner ── */}
      {(!user?.phone || !user?.studentId) && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-surface-900 dark:text-white font-bold">Profile Incomplete</h4>
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Please add your phone number and student ID to use all features.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            Complete Profile
          </button>
        </div>
      )}
      
      <ProfileCompletionModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* ── iOS PWA Instructions Modal ── */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowIosPrompt(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>
            
            <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-4">
              <FiZap className="text-primary-400 text-xl" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">iOS Push Notifications</h3>
            <p className="text-surface-300 mb-6 text-sm leading-relaxed">
              To receive instant notifications on your iPhone or iPad, you need to add this app to your Home Screen first.
            </p>
            
            <div className="bg-surface-900/50 rounded-xl p-4 space-y-4 mb-6 border border-surface-700/50">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">1</div>
                <p className="text-sm text-surface-300">Tap the <FiShare className="inline mx-1 text-primary-400" /> <b>Share</b> button in your Safari menu bar.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">2</div>
                <p className="text-sm text-surface-300">Scroll down and tap <FiPlusSquare className="inline mx-1 text-primary-400" /> <b>Add to Home Screen</b>.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">3</div>
                <p className="text-sm text-surface-300">Open the app from your Home Screen to enable notifications!</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowIosPrompt(false)}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Welcome Banner ── */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-bg" />
        <div className="dashboard-hero-orb orb-1" />
        <div className="dashboard-hero-orb orb-2" />
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-left">
            <span className="dashboard-greeting-tag">
              <FiZap size={12} /> {greeting}
            </span>
            <h1 className="dashboard-hero-title">
              Welcome back, <span className="dashboard-hero-name">{firstName}!</span> 👋
            </h1>
            <p className="dashboard-hero-subtitle">
              Track your lost items, view AI matches, and manage claims — all in one place.
            </p>
          </div>
          <div className="dashboard-hero-actions">
            <Link to="/dashboard/report-lost" className="hero-btn-primary">
              <FiPlusCircle size={16} /> Report Lost
            </Link>
            <Link to="/dashboard/report-found" className="hero-btn-secondary">
              <FiPackage size={16} /> Report Found
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dashboard-stats-grid">
        <PremiumStatCard
          title="Lost Reports"
          value={stats.totalLostItems}
          icon={FiSearch}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          delay={0}
          to="/dashboard/my-lost"
        />
        <PremiumStatCard
          title="Found Listings"
          value={stats.totalFoundItems}
          icon={FiPackage}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          delay={80}
          to="/dashboard/my-found"
        />
        <PremiumStatCard
          title="Submitted Claims"
          value={stats.totalClaims}
          icon={FiCheckSquare}
          gradient="linear-gradient(135deg, #06b6d4, #0284c7)"
          delay={160}
          to="/dashboard/claims"
        />
        <PremiumStatCard
          title="Recovered Items"
          value={stats.successfulRecoveries}
          icon={FiShield}
          gradient="linear-gradient(135deg, #8b5cf6, #6366f1)"
          delay={240}
          to="/dashboard/claims"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="dashboard-main-grid">

        {/* Left: AI Matches */}
        <div className="dashboard-matches-col">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title">
              <span className="section-icon-badge">
                <FiActivity size={16} />
              </span>
              <h2>AI Match Recommendations</h2>
            </div>
            <Link to="/dashboard/my-matches" className="view-all-link">
              View All <FiArrowRight size={13} />
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No matches yet</h3>
              <p>We'll notify you instantly when AI finds a potential match for your reported items.</p>
              <Link to="/dashboard/report-lost" className="empty-cta">
                <FiPlusCircle size={14} /> Report a Lost Item
              </Link>
            </div>
          ) : (
            <div className="matches-list">
              {matches.map((match) => (
                <MatchCard
                  key={match._id}
                  match={match}
                  onConfirm={handleMatchConfirm}
                  onReject={handleMatchReject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Actions + Tips */}
        <div className="dashboard-sidebar-col">

          {/* Quick Actions */}
          <div className="dashboard-section-header">
            <div className="dashboard-section-title">
              <span className="section-icon-badge">
                <FiZap size={16} />
              </span>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-actions-list">
            <QuickActionCard
              to="/dashboard/my-lost"
              icon={FiSearch}
              label="My Lost Reports"
              description="View & manage your reports"
              gradient="linear-gradient(135deg, #f59e0b, #d97706)"
              delay={0}
            />
            <QuickActionCard
              to="/dashboard/my-found"
              icon={FiPackage}
              label="My Found Listings"
              description="Items you've reported found"
              gradient="linear-gradient(135deg, #10b981, #059669)"
              delay={60}
            />
            <QuickActionCard
              to="/dashboard/my-matches"
              icon={FiActivity}
              label="AI Matches"
              description="Smart item suggestions"
              gradient="linear-gradient(135deg, #8b5cf6, #6366f1)"
              delay={120}
            />
            <QuickActionCard
              to="/dashboard/claims"
              icon={FiCheckSquare}
              label="My Claims"
              description="Track your claim statuses"
              gradient="linear-gradient(135deg, #06b6d4, #0284c7)"
              delay={180}
            />
            <QuickActionCard
              to="/dashboard/profile"
              icon={FiStar}
              label="Profile Settings"
              description="Update your information"
              gradient="linear-gradient(135deg, #ec4899, #db2777)"
              delay={240}
            />
          </div>

          {/* Tips Card */}
          <div className="dashboard-tips-card">
            <div className="tips-header">
              <FiTrendingUp size={16} />
              <span>Pro Tip</span>
            </div>
            <p>Add detailed descriptions and photos when reporting items. AI matching is <strong>3x more accurate</strong> with clear images!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

