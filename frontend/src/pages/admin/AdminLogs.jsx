import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Activity, ShieldAlert, SlidersHorizontal, Calendar, Info } from 'lucide-react';
import { fetchAdminAuditLogs } from '../../redux/slices/adminSlice';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatAbsoluteDate as formatDate } from '../../utils/formatDate';

const AdminLogs = () => {
  const dispatch = useDispatch();
  const { logs, logsPagination, isLoading, error } = useSelector((state) => state.admin);

  // States
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAdminAuditLogs({ action: actionFilter, page, limit: 12 }));
  }, [dispatch, actionFilter, page]);

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const actionOptions = [
    { value: 'USER_ACTIVATION', label: 'User Activation' },
    { value: 'USER_DEACTIVATION', label: 'User Deactivation' },
    { value: 'CLAIM_APPROVAL', label: 'Claim Approval' },
    { value: 'CLAIM_REJECTION', label: 'Claim Rejection' },
    { value: 'CATEGORY_CREATE', label: 'Category Creation' },
    { value: 'CATEGORY_UPDATE', label: 'Category Modification' },
    { value: 'CATEGORY_DELETE', label: 'Category Deletion' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          System Audit Trails
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trace security logs, user state changes, and administrative actions performed across the system.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="w-full md:w-64">
          <Select 
            label="Filter by Admin Action"
            value={actionFilter}
            onChange={handleActionChange}
            options={actionOptions}
            placeholder="All System Actions"
          />
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to fetch audit trails: {error}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState 
          title="No Audit Logs Found" 
          message="No matching audit reports match this filter type." 
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 dark:backdrop-blur-md">
            <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">Timestamp</th>
                  <th scope="col" className="px-6 py-4">Admin Officer</th>
                  <th scope="col" className="px-6 py-4">Action Event</th>
                  <th scope="col" className="px-6 py-4">Target Resource</th>
                  <th scope="col" className="px-6 py-4">Details Summary</th>
                  <th scope="col" className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {logs.map((log) => (
                  <tr 
                    key={log._id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Admin */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.adminId?.fullName || 'System Automated'}
                      </div>
                      <div className="text-xs text-slate-400">{log.adminId?.email || 'N/A'}</div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        log.action.includes('DEACTIVATION') || log.action.includes('REJECTION') || log.action.includes('DELETE')
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                          : log.action.includes('ACTIVATION') || log.action.includes('APPROVAL') || log.action.includes('CREATE')
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-6 py-4 text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">{log.targetModel}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[120px]" title={log.targetId}>
                        {log.targetId}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 text-xs max-w-xs text-slate-700 dark:text-slate-300 leading-normal">
                      {log.details}
                    </td>

                    {/* IP */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logsPagination.totalPages > 1 && (
            <Pagination 
              page={page} 
              totalPages={logsPagination.totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminLogs;

