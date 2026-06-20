// ============================================
// Match Card Component
// Side-by-side comparison for AI matches
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { FiCheck, FiX, FiLink, FiCheckCircle } from 'react-icons/fi';
import { optimizeImageUrl } from '../../utils/helpers';

export const MatchCard = React.memo(({ match, onConfirm, onReject, isLoading = false }) => {
  const lost = match.lostItemId;
  const found = match.foundItemId;
  
  if (!lost || !found) return null;

  // Retrieve matching score styles
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30';
    if (score >= 60) return 'text-primary-500 bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/30';
    return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30';
  };

  return (
    <div className="card p-6 border-l-4 border-l-primary-500">
      {/* Top Header: Score & Reason */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-700/50 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(match.similarityScore)}`}>
            🎯 {match.similarityScore}% Match
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-400">
            Confidence: {match.confidencePercentage}%
          </span>
        </div>
        <span className="text-xs font-semibold capitalize bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300 px-2 py-0.5 rounded-md">
          Status: {match.status}
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Lost Item */}
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/30 border border-surface-200/50 dark:border-surface-800/50 flex flex-col h-full">
          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-2 block">
            Reported Lost Item
          </span>
          {lost.images && lost.images.length > 0 ? (
            <img src={optimizeImageUrl(lost.images[0].url, 'auto', 300)} alt={lost.itemName} className="w-full h-32 object-contain bg-surface-100 dark:bg-surface-800 rounded-lg mb-3 shadow-sm border border-surface-200 dark:border-surface-800 p-1" />
          ) : (
            <div className="w-full h-32 bg-surface-200 dark:bg-surface-800 rounded-lg mb-3 flex items-center justify-center text-surface-400">No Image</div>
          )}
          <Link to={`/lost-items/${lost._id}`} className="hover:underline">
            <h5 className="text-sm font-bold text-surface-900 dark:text-white mt-1 line-clamp-1">
              {lost.itemName}
            </h5>
          </Link>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2">
            {lost.description}
          </p>
          <div className="mt-auto pt-3 flex flex-col gap-1 text-[11px] text-surface-500 dark:text-surface-400">
            <p className="truncate">📍 Location: <strong>{lost.lostLocation}</strong></p>
            <p>📅 Date: <strong>{new Date(lost.lostDate).toLocaleDateString()}</strong></p>
            <p className="truncate">👤 Reported By: <strong>{lost.userId?.fullName || 'Me'}</strong></p>
          </div>
        </div>

        {/* Found Item */}
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/30 border border-surface-200/50 dark:border-surface-800/50 flex flex-col h-full">
          <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide mb-2 block">
            Found Item Listing
          </span>
          {found.images && found.images.length > 0 ? (
            <img src={optimizeImageUrl(found.images[0].url, 'auto', 300)} alt={found.itemName} className="w-full h-32 object-contain bg-surface-100 dark:bg-surface-800 rounded-lg mb-3 shadow-sm border border-surface-200 dark:border-surface-800 p-1" />
          ) : (
            <div className="w-full h-32 bg-surface-200 dark:bg-surface-800 rounded-lg mb-3 flex items-center justify-center text-surface-400">No Image</div>
          )}
          <Link to={`/found-items/${found._id}`} className="hover:underline">
            <h5 className="text-sm font-bold text-surface-900 dark:text-white mt-1 line-clamp-1">
              {found.itemName}
            </h5>
          </Link>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2">
            {found.description}
          </p>
          <div className="mt-auto pt-3 flex flex-col gap-1 text-[11px] text-surface-500 dark:text-surface-400">
            <p className="truncate">📍 Location: <strong>{found.foundLocation}</strong></p>
            <p>📅 Date: <strong>{new Date(found.foundDate).toLocaleDateString()}</strong></p>
            <p className="truncate">👤 Reported By: <strong>{found.userId?.fullName || 'Me'}</strong></p>
          </div>
        </div>
      </div>

      {/* AI Reasons */}
      <div className="mt-4 p-3 rounded-lg bg-primary-500/5 border border-primary-500/10 text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
        <strong>Matching details:</strong> {match.reason}
      </div>

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
            Not My Item
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => onConfirm(match._id)}
            disabled={isLoading}
            icon={<FiCheck />}
          >
            Confirm Match
          </Button>
        </div>
      )}

      {match.status === 'confirmed' && (
        <div className="flex justify-between items-center mt-6 border-t border-surface-100 dark:border-surface-700/50 pt-4">
          <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
            <FiCheck /> Match Confirmed
          </span>
          {['claimed', 'resolved', 'returned'].includes(found.status?.toLowerCase()) ? (
            <span className="btn bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300 btn-sm rounded-lg flex items-center gap-1.5 px-4 py-2 cursor-default opacity-80">
              <FiCheckCircle /> Item Claimed
            </span>
          ) : (
            <Link to={`/found-items/${found._id}`} className="btn btn-primary btn-sm rounded-lg flex items-center gap-1.5 px-4 py-2">
              <FiLink /> View Item to Claim
            </Link>
          )}
        </div>
      )}
    </div>
  );
});

export default MatchCard;
//
