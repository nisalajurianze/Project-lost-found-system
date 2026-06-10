// ============================================
// My AI Matches Page Component
// Lists suggested matches with confirm/reject action handlers
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMatches, confirmOrRejectMatch } from '../../redux/slices/matchSlice';
import MatchCard from '../../components/cards/MatchCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const MyMatches = () => {
  const dispatch = useDispatch();
  const { matches, isLoading } = useSelector((state) => state.matches);

  const [activeTab, setActiveTab] = useState('suggested');

  useEffect(() => {
    dispatch(fetchMatches(activeTab));
  }, [dispatch, activeTab]);

  const handleConfirm = async (id) => {
    try {
      await dispatch(confirmOrRejectMatch({ id, status: 'confirmed' })).unwrap();
      toast.success('Match confirmed! File a claim request.');
    } catch (err) {
      toast.error(err || 'Failed to confirm match.');
    }
  };

  const handleReject = async (id) => {
    try {
      await dispatch(confirmOrRejectMatch({ id, status: 'rejected' })).unwrap();
      toast.success('Match rejected.');
    } catch (err) {
      toast.error(err || 'Failed to reject match.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          AI Recommendations
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Review potential matches detected by our campus-wide scan
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-200 dark:border-surface-800 pb-px">
        {['suggested', 'confirmed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all capitalize ${
              activeTab === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-white'
            }`}
          >
            {tab} Matches
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && matches.length === 0 ? (
        <Loader fullPage />
      ) : matches.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} matches found`}
          description={
            activeTab === 'suggested'
              ? 'Our matching engine runs automatically in the background. You will receive an alert as soon as matching items appear.'
              : 'You have not confirmed any recommendations yet.'
          }
        />
      ) : (
        <div className="space-y-6">
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              onConfirm={handleConfirm}
              onReject={handleReject}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default MyMatches;
