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
  FiMapPin, FiClock, FiStar, FiShield
} from 'react-icons/fi';
import MatchCard from '../../components/cards/MatchCard';
import api from '../../services/api';
import matchService from '../../services/matchService';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

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

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/users/stats');
      setStats(statsRes.data.data);
      const matchesData = await matchService.getMatches('suggested');
      setMatches(matchesData.slice(0, 2));
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
              to="/dashboard/my-claims"
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

