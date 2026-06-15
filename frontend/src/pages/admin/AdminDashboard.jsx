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
          icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          label="Total Registered Users"
          value={summary.totalUsers}
          color="blue"
        />
        <StatCard 
          icon={<HelpCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
          label="Lost Item Reports"
          value={summary.totalLostItems}
          color="red"
        />
        <StatCard 
          icon={<CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
          label="Found Item Listings"
          value={summary.totalFoundItems}
          color="emerald"
        />
        <StatCard 
          icon={<FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          label="Recovery Success Rate"
          value={`${recoveryRate}%`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Successful Handbacks</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{summary.successfulRecoveries}</p>
          </div>
          <Link 
            to="/admin/found-items?status=claimed" 
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition duration-200"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lost vs Found Bar Chart */}
        <div className="lg:col-span-2 card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Monthly Comparison (Lost vs Found)
            </h2>
          </div>
          <MonthlyReportsChart 
            monthlyLost={analytics.monthlyLost} 
            monthlyFound={analytics.monthlyFound} 
          />
        </div>

        {/* Claim status pie breakdown */}
        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <Grid className="h-5 w-5 text-indigo-500" />
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

