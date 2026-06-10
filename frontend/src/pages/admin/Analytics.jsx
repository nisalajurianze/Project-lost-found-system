import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart3, TrendingUp, Award, Calendar, CheckCircle2 } from 'lucide-react';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import StatCard from '../../components/cards/StatCard';
import MonthlyReportsChart from '../../components/charts/MonthlyReportsChart';
import StatusPieChart from '../../components/charts/StatusPieChart';
import Loader from '../../components/common/Loader';

const Analytics = () => {
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

  // Calculations
  const recoveryRate = summary.totalLostItems > 0 
    ? Math.round((summary.successfulRecoveries / summary.totalLostItems) * 100) 
    : 0;

  const totalReports = summary.totalLostItems + summary.totalFoundItems;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          System Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analyze monthly report frequencies, resolution rates, and listing distributions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to load stats: {error}
        </div>
      )}

      {/* Analytical Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Submissions</p>
            <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{totalReports}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Lost + Found items combined</p>
          </div>
        </div>

        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Handed Back Rate</p>
            <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{recoveryRate}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Approved claim recovery rate</p>
          </div>
        </div>

        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Success Count</p>
            <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{summary.successfulRecoveries}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Items successfully returned</p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Monthly Report Volume Analysis
          </h2>
          <MonthlyReportsChart 
            monthlyLost={analytics.monthlyLost} 
            monthlyFound={analytics.monthlyFound} 
          />
        </div>

        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
              Lost Reports Status
            </h2>
            <StatusPieChart data={analytics.lostStatusBreakdown} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
            Found Listings Status
          </h2>
          <StatusPieChart data={analytics.foundStatusBreakdown} />
        </div>

        <div className="lg:col-span-2 card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Insights</h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              • The <strong>Recovery Success Rate</strong> of <strong className="text-indigo-600 dark:text-indigo-400">{recoveryRate}%</strong> shows the ratio of successfully matched and claimed items relative to total reported lost items.
            </p>
            <p>
              • Regularly monitor the <strong>Monthly Report Volume</strong> bar graph to identify periods of high activity (e.g., exam months, start of semesters) and manage handback staff allocation.
            </p>
            <p>
              • Check status distribution pie charts to ensure that matched items proceed to claimant handbacks and don't remain stuck in the system status pipelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

