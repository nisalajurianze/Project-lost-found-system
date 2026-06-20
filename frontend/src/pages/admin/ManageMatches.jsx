import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Cpu, RefreshCcw, MapPin, Calendar, Check, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMatches, confirmOrRejectMatch } from '../../redux/slices/matchSlice';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { getConfidenceColor, getConfidenceLabel, optimizeImageUrl } from '../../utils/helpers';
import { formatAbsoluteDate as formatDate } from '../../utils/formatDate';

const ManageMatches = () => {
  const dispatch = useDispatch();
  const { matches, isLoading, error } = useSelector((state) => state.matches);
  const [status, setStatus] = useState('');

  useEffect(() => {
    dispatch(fetchMatches(status));
  }, [dispatch, status]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const handleReviewMatch = async (matchId, newStatus) => {
    try {
      await dispatch(confirmOrRejectMatch({ id: matchId, status: newStatus })).unwrap();
      toast.success(`Match status updated to ${newStatus}.`);
      dispatch(fetchMatches(status)); // Reload matches
    } catch (err) {
      toast.error(err || 'Failed to update match status.');
    }
  };

  const matchStatusOptions = [
    { value: 'suggested', label: 'Suggested (AI Created)' },
    { value: 'confirmed', label: 'Confirmed (User Accepted)' },
    { value: 'rejected', label: 'Rejected (User Denied)' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            AI Matching Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View item relationship correlations calculated by the heuristics and Vision AI matching engine.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => dispatch(fetchMatches(status))}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="w-full md:w-64">
          <Select 
            label="Filter by Match Status"
            value={status}
            onChange={handleStatusChange}
            options={matchStatusOptions}
            placeholder="All Matches"
          />
        </div>
      </div>

      {/* Matches Grid */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to load matches: {error}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState 
          title="No Match Records Found" 
          message="No matching records match this filter setting." 
        />
      ) : (
        <div className="space-y-6">
          {matches.map((match) => {
            const lost = match.lostItemId;
            const found = match.foundItemId;
            
            if (!lost || !found) return null;

            return (
              <div 
                key={match._id} 
                className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={match.status} />
                    <span className="text-xs text-slate-400">
                      Matched on: {formatDate(match.matchedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 px-3 py-1 rounded-full">
                    <span className={`text-base font-bold ${getConfidenceColor(match.similarityScore)}`}>
                      {match.similarityScore}%
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      {getConfidenceLabel(match.similarityScore)} Match
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lost Item */}
                  <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 space-y-3">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                      Lost Item
                    </span>
                    <div className="flex gap-3">
                      <div className="h-16 w-16 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center font-bold text-lg overflow-hidden border border-red-200 dark:border-red-900/30 flex-shrink-0">
                        {lost.images?.[0]?.url ? (
                          <img src={optimizeImageUrl(lost.images[0].url, 200)} alt={lost.itemName} className="h-full w-full object-cover" />
                        ) : (
                          lost.itemName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{lost.itemName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{lost.category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5" /> {lost.lostLocation}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{lost.description}"
                    </p>
                    <div className="text-[11px] text-slate-500 border-t border-red-100 dark:border-red-900/20 pt-2">
                      Reported by: <strong>{match.lostUserId?.fullName} ({match.lostUserId?.studentId})</strong>
                    </div>
                  </div>

                  {/* Found Item */}
                  <div className="p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 space-y-3">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Found Item
                    </span>
                    <div className="flex gap-3">
                      <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/30 flex-shrink-0">
                        {found.images?.[0]?.url ? (
                          <img src={optimizeImageUrl(found.images[0].url, 200)} alt={found.itemName} className="h-full w-full object-cover" />
                        ) : (
                          found.itemName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{found.itemName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{found.category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5" /> {found.foundLocation}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{found.description}"
                    </p>
                    <div className="text-[11px] text-slate-500 border-t border-emerald-100 dark:border-emerald-900/20 pt-2">
                      Handed in by: <strong>{match.foundUserId?.fullName} ({match.foundUserId?.studentId})</strong>
                    </div>
                  </div>
                </div>

                {/* AI Explanation / Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span>AI Reasoning Summary</span>
                  </div>
                  <p className="leading-relaxed">
                    {match.reason}
                  </p>
                  {match.aiSummary && (
                    <p className="border-t border-slate-200 dark:border-slate-800/80 pt-2 text-[11px] leading-relaxed">
                      {match.aiSummary}
                    </p>
                  )}
                </div>

                {/* Actions (if suggested status) */}
                {match.status === 'suggested' && (
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReviewMatch(match._id, 'rejected')}
                      className="text-red-500 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1"
                    >
                      <X className="h-4 w-4" /> Reject Match
                    </Button>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => handleReviewMatch(match._id, 'confirmed')}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" /> Confirm Match
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageMatches;

