// ============================================
// Match Card Component
// Side-by-side comparison for AI matches
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Button from '../common/Button';
import { FiCheck, FiX, FiLink, FiCheckCircle } from 'react-icons/fi';
import { optimizeImageUrl } from '../../utils/helpers';
import { MapPin, Calendar, User } from 'lucide-react';
import MatchExplanation from '../common/MatchExplanation';
import aiFeedbackService from '../../services/aiFeedbackService';
import { useLanguage } from '../../i18n/LanguageContext';

export const MatchCard = React.memo(({ match, onConfirm, onReject, isLoading = false }) => {
  const lost = match.lostItemId;
  const found = match.foundItemId;
  const [feedbackState, setFeedbackState] = useState('');
  const { t } = useLanguage();

  const submitCorrection = async (decision) => {
    setFeedbackState('saving');
    try {
      await aiFeedbackService.submit({ targetType: 'Match', targetId: match._id, decision, algorithmVersion: match.algorithmVersion || '' });
      setFeedbackState('saved');
    } catch {
      setFeedbackState('error');
    }
  };

  if (!lost || !found) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30';
    if (score >= 60) return 'text-primary-500 bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/30';
    return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30';
  };

  const { user } = useSelector((state) => state.auth);

  // Determine link based on user ownership
  // If the user posted the Found item, they should visit the Lost item to claim "I have this"
  // If the user posted the Lost item, they should visit the Found item to claim "This is mine"
  const isUserFinder = user && found.userId && found.userId._id === user._id;

  const targetLink = isUserFinder ? `/lost-items/${lost._id}` : `/found-items/${found._id}`;
  const targetStatus = isUserFinder ? lost.status : found.status;

  return (
    <div className="card p-6 border-l-4 border-l-primary-500">
      {/* Top Header: Score & Reason */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-700/50 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(match.similarityScore)}`}>
            🎯 {t('match.score', { score: match.similarityScore })}
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-400">
            {t('match.confidence', { score: match.confidencePercentage })}
          </span>
        </div>
        <span className="text-xs font-semibold capitalize bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300 px-2 py-0.5 rounded-md">
          {t('match.status', { status: match.status })}
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Lost Item */}
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/30 border border-surface-200/50 dark:border-surface-800/50 flex flex-col h-full">
          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-2 block">
            {t('match.reportedLost')}
          </span>
          {lost.images && lost.images.length > 0 ? (
            <img src={optimizeImageUrl(lost.images[0].url, 300)} alt={lost.itemName} className="w-full h-32 object-contain bg-surface-100 dark:bg-surface-800 rounded-lg mb-3 shadow-sm border border-surface-200 dark:border-surface-800 p-1" />
          ) : (
            <div className="w-full h-32 bg-surface-200 dark:bg-surface-800 rounded-lg mb-3 flex items-center justify-center text-surface-400">{t('match.noImage')}</div>
          )}
          <Link to={`/lost-items/${lost._id}`} className="hover:underline">
            <h5 className="text-sm font-bold text-surface-900 dark:text-white mt-1 line-clamp-1">
              {lost.itemName}
            </h5>
          </Link>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2">
            {lost.description}
          </p>
          <div className="mt-auto pt-3 flex flex-col gap-1.5 text-[11px] text-surface-500 dark:text-surface-400">
            <p className="truncate flex items-center gap-1.5"><MapPin size={12} className="text-surface-400" /> <span>{t('match.location')} <strong>{lost.lostLocation}</strong></span></p>
            <p className="flex items-center gap-1.5"><Calendar size={12} className="text-surface-400" /> <span>{t('match.date')} <strong>{new Date(lost.lostDate).toLocaleDateString()}</strong></span></p>
            <p className="truncate flex items-center gap-1.5"><User size={12} className="text-surface-400" /> <span>{t('match.reportedBy')} <strong>{lost.userId?.fullName || t('match.me')}</strong></span></p>
          </div>
        </div>

        {/* Found Item */}
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/30 border border-surface-200/50 dark:border-surface-800/50 flex flex-col h-full">
          <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide mb-2 block">
            {t('match.foundListing')}
          </span>
          {found.images && found.images.length > 0 ? (
            <img src={optimizeImageUrl(found.images[0].url, 300)} alt={found.itemName} className="w-full h-32 object-contain bg-surface-100 dark:bg-surface-800 rounded-lg mb-3 shadow-sm border border-surface-200 dark:border-surface-800 p-1" />
          ) : (
            <div className="w-full h-32 bg-surface-200 dark:bg-surface-800 rounded-lg mb-3 flex items-center justify-center text-surface-400">{t('match.noImage')}</div>
          )}
          <Link to={`/found-items/${found._id}`} className="hover:underline">
            <h5 className="text-sm font-bold text-surface-900 dark:text-white mt-1 line-clamp-1">
              {found.itemName}
            </h5>
          </Link>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2">
            {found.description}
          </p>
          <div className="mt-auto pt-3 flex flex-col gap-1.5 text-[11px] text-surface-500 dark:text-surface-400">
            <p className="truncate flex items-center gap-1.5"><MapPin size={12} className="text-surface-400" /> <span>{t('match.location')} <strong>{found.foundLocation}</strong></span></p>
            <p className="flex items-center gap-1.5"><Calendar size={12} className="text-surface-400" /> <span>{t('match.date')} <strong>{new Date(found.foundDate).toLocaleDateString()}</strong></span></p>
            <p className="truncate flex items-center gap-1.5"><User size={12} className="text-surface-400" /> <span>{t('match.reportedBy')} <strong>{found.userId?.fullName || t('match.me')}</strong></span></p>
          </div>
        </div>
      </div>

      {/* Explainable similarity evidence */}
      <div className="mt-4">
        <MatchExplanation match={match} compact />
      </div>
      <details className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm dark:border-surface-800 dark:bg-surface-900/40">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t('match.correctDetail')}</summary>
        <p className="mb-2 text-xs text-surface-500">{t('match.correctionDesc')}</p>
        <div className="flex flex-wrap gap-2">
          {[['wrong-category', 'match.wrongCategory'], ['wrong-colour', 'match.wrongColour'], ['wrong-location', 'match.wrongLocation']].map(([decision, labelKey]) => <button key={decision} type="button" disabled={feedbackState === 'saving' || feedbackState === 'saved'} onClick={() => submitCorrection(decision)} className="min-h-11 rounded-lg border border-surface-300 px-3 py-2 text-xs font-semibold dark:border-surface-700">{t(labelKey)}</button>)}
        </div>
        {feedbackState === 'saved' && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t('match.correctionSaved')}</p>}
        {feedbackState === 'error' && <p role="alert" className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{t('match.correctionError')}</p>}
      </details>

      {/* Actions */}
      {match.status === 'suggested' && (
        <div className="flex gap-3 justify-end mt-6 border-t border-surface-100 dark:border-surface-700/50 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(match._id)}
            disabled={isLoading}
            icon={<FiX />}
            className="text-red-500 border-red-500/30 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            {t('match.notMyItem')}
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => onConfirm(match._id)}
            disabled={isLoading}
            icon={<FiCheck />}
          >
            {t('match.confirm')}
          </Button>
        </div>
      )}

      {match.status === 'confirmed' && (
        <div className="flex justify-between items-center mt-6 border-t border-surface-100 dark:border-surface-700/50 pt-4">
          <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
            <FiCheck /> {t('match.confirmed')}
          </span>
          {['claimed', 'resolved', 'returned', 'closed'].includes(targetStatus?.toLowerCase()) ? (
            <span className="btn bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300 btn-sm rounded-lg flex items-center gap-1.5 px-4 py-2 cursor-default opacity-80">
              <FiCheckCircle /> {t('match.itemResolved')}
            </span>
          ) : (
            <Link to={targetLink} className="btn btn-primary btn-sm rounded-lg flex items-center gap-1.5 px-4 py-2">
              <FiLink /> {t('match.viewToClaim')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
});

export default MatchCard;
//
