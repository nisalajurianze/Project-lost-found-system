// ============================================
// Student Dashboard Page Component
// Stat aggregates, recent match list, and shortcut actions
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiPlusCircle, FiPackage, FiActivity, FiCheckSquare } from 'react-icons/fi';
import StatCard from '../../components/cards/StatCard';
import MatchCard from '../../components/cards/MatchCard';
import api from '../../services/api';
import matchService from '../../services/matchService';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

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
      // 1. Fetch User Stats
      const statsRes = await api.get('/users/stats');
      setStats(statsRes.data.data);

      // 2. Fetch Recent Suggested Matches
      const matchesData = await matchService.getMatches('suggested');
      setMatches(matchesData.slice(0, 2)); // Show top 2 matches
    } catch (err) {
      console.error('Failed to load student dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
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

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Card */}
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-primary-900 to-indigo-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold font-display">
            Welcome Back, {user?.fullName}! 👋
          </h2>
          <p className="text-xs text-primary-200 mt-1.5 max-w-md">
            Manage your reports, view AI recommendations, and verify claims on reported property.
          </p>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex gap-3 mt-4 md:mt-0 relative z-10">
          <Link to="/dashboard/report-lost" className="btn btn-primary btn-sm rounded-lg bg-white text-primary-900 hover:bg-surface-100 flex items-center gap-1.5 font-bold shadow-md">
            <FiPlusCircle /> Report Lost
          </Link>
          <Link to="/dashboard/report-found" className="btn btn-outline btn-sm rounded-lg border-white text-white hover:bg-white/10 flex items-center gap-1.5 font-bold">
            <FiPackage /> Report Found
          </Link>
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Lost Reports"
          value={stats.totalLostItems}
          icon={<FiPlusCircle />}
          color="warning"
        />
        <StatCard
          title="Found Listings"
          value={stats.totalFoundItems}
          icon={<FiPackage />}
          color="success"
        />
        <StatCard
          title="Submitted Claims"
          value={stats.totalClaims}
          icon={<FiCheckSquare />}
          color="info"
        />
        <StatCard
          title="Recovered Belongings"
          value={stats.successfulRecoveries}
          icon={<FiActivity />}
          color="primary"
        />
      </div>

      {/* AI Matches Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Suggestions Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="section-title">
              💡 Top AI Match Recommendations
            </h3>
            <Link to="/dashboard/my-matches" className="text-xs font-semibold text-primary-500 hover:underline">
              View All
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="p-8 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 text-center text-sm text-surface-500 dark:text-surface-400">
              No suggested matches found yet. We will notify you when matching items are reported.
            </div>
          ) : (
            <div className="space-y-4">
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

        {/* Shortcuts Links Column */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="section-title">
            ⚙️ Quick Dashboard Shortcuts
          </h3>
          <div className="card bg-white dark:bg-surface-800 p-6 flex flex-col gap-4 border border-surface-200 dark:border-surface-700/60 shadow-sm">
            <Link to="/dashboard/my-lost" className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/30 hover:bg-surface-100 rounded-xl transition-all">
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">My Lost Reports</span>
              <span className="text-xs text-primary-500 font-bold">&rarr;</span>
            </Link>
            <Link to="/dashboard/my-found" className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/30 hover:bg-surface-100 rounded-xl transition-all">
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">My Found Listings</span>
              <span className="text-xs text-primary-500 font-bold">&rarr;</span>
            </Link>
            <Link to="/dashboard/my-claims" className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/30 hover:bg-surface-100 rounded-xl transition-all">
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">My Claim Statuses</span>
              <span className="text-xs text-primary-500 font-bold">&rarr;</span>
            </Link>
            <Link to="/dashboard/profile" className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/30 hover:bg-surface-100 rounded-xl transition-all">
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">Profile Settings</span>
              <span className="text-xs text-primary-500 font-bold">&rarr;</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
