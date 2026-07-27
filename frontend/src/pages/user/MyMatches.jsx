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
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

export const MyMatches = () => {
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const { matches, isLoading } = useSelector((state) => state.matches);

  const [activeTab, setActiveTab] = useState('suggested');

  useEffect(() => {
    dispatch(fetchMatches(activeTab));
  }, [dispatch, activeTab]);

  const handleConfirm = async (id) => {
    try {
      await dispatch(confirmOrRejectMatch({ id, status: 'confirmed' })).unwrap();
      toast.success(t('myMatches.confirmedSuccess'));
    } catch (err) {
      toast.error(err || t('myMatches.confirmError'));
    }
  };

  const handleReject = async (id) => {
    try {
      await dispatch(confirmOrRejectMatch({ id, status: 'rejected' })).unwrap();
      toast.success(t('myMatches.rejectedSuccess'));
    } catch (err) {
      toast.error(err || t('myMatches.rejectError'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          {t('myMatches.title')}
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          {t('myMatches.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-200 dark:border-surface-800 pb-px">
        {['suggested', 'confirmed'].map((tab) => (
          <button type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all capitalize ${
              activeTab === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-white'
            }`}
          >
            {t('myMatches.tab', { tab: t(`myMatches.${tab}`) })}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && matches.length === 0 ? (
        <Loader fullPage />
      ) : matches.length === 0 ? (
        <EmptyState
          title={t('myMatches.emptyTitle', {
            tab: language === 'en' ? t(`myMatches.${activeTab}`).toLowerCase() : t(`myMatches.${activeTab}`),
          })}
          description={
            activeTab === 'suggested'
              ? t('myMatches.emptySuggestedDesc')
              : t('myMatches.emptyConfirmedDesc')
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

