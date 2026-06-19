import React, { useEffect } from 'react';
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
  Grid
} from 'lucide-react';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import StatCard from '../../components/cards/StatCard';
import MonthlyReportsChart from '../../components/charts/MonthlyReportsChart';
import StatusPieChart from '../../components/charts/StatusPieChart';
import Loader from '../../components/common/Loader';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { stats, isLoading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  if (isLoading && !stats) {
    return <Loader fullScreen />;
  }

  const summary = stats?.summary || {
    totalUsers: 0,
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaims: 0,
    successfulRecoveries: 0,
    pendingClaims: 0
  };

  const analytics = stats?.analytics || {
    monthlyLost: [],
    monthlyFound: [],
    lostStatusBreakdown: {},
    foundStatusBreakdown: {}
  };

  // Recovery rate calculation
  const recoveryRate = summary.totalLostItems > 0 
    ? Math.round((summary.successfulRecoveries / summary.totalLostItems) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor university lost & found activities, approve claims, and review audit trails.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to load dashboard metrics: {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="h-7 w-7 text-blue-500 dark:text-blue-400" />}
          title="Total Registered Users"
          value={summary.totalUsers}
          color="blue"
        />
        <StatCard 
          icon={<HelpCircle className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />}
          title="Lost Item Reports"
          value={summary.totalLostItems}
          color="indigo"
        />
        <StatCard 
          icon={<CheckCircle className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />}
          title="Found Item Listings"
          value={summary.totalFoundItems}
          color="emerald"
        />
        <StatCard 
          icon={<FileText className="h-7 w-7 text-purple-500 dark:text-purple-400" />}
          title="Recovery Success Rate"
          value={`${recoveryRate}%`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-900/80 dark:to-teal-900/80 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-emerald-500/20">
          <div>
            <p className="text-sm font-semibold text-emerald-50 dark:text-emerald-200 uppercase tracking-widest">Successful Handbacks</p>
            <p className="text-4xl font-extrabold mt-2 text-white">{summary.successfulRecoveries}</p>
          </div>
          <Link 
            to="/admin/found-items?status=claimed" 
            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
          >
            <ArrowRight className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lost vs Found Bar Chart */}
        <div className="lg:col-span-2 card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Monthly Comparison (Lost vs Found)
            </h2>
          </div>
          <MonthlyReportsChart 
            monthlyLost={analytics.monthlyLost} 
            monthlyFound={analytics.monthlyFound} 
          />
        </div>

        {/* Claim status pie breakdown */}
        <div className="card bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl border border-surface-200 dark:border-surface-700/50 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-6 text-surface-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Grid className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Lost Item Statuses
          </h2>
          <StatusPieChart data={analytics.lostStatusBreakdown} />
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Shortcuts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/admin/users" 
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2"
          >
            <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Manage Users</span>
          </Link>

          <Link 
            to="/admin/categories" 
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2"
          >
            <PlusCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Manage Categories</span>
          </Link>
          <Link 
            to="/admin/logs" 
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center text-center space-y-2"
          >
            <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">System Logs</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

