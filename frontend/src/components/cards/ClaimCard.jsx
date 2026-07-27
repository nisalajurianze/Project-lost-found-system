// ============================================
// Claim Card Component
// Displays item claim details and actions
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { FiExternalLink, FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import { User } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatDate';
import WorkflowTimeline from '../common/WorkflowTimeline';
import { useLanguage } from '../../i18n/LanguageContext';

export const ClaimCard = ({ claim, onReview, onShareContact, onFeedback, onResolve, isAdmin = false, canReview = false, isLoading = false }) => {
  const { t } = useLanguage();
  const claimant = claim.claimantId;
  const targetItem = claim.foundItemId || claim.lostItemId;
  const itemOwner = targetItem?.userId;
  const itemType = claim.foundItemId ? 'Found Item' : 'Lost Item';
  const itemTypeLabel = claim.foundItemId ? t('claimCard.foundItem') : t('claimCard.lostItem');
  const itemUrl = claim.foundItemId ? `/found-items/${targetItem._id}` : `/lost-items/${targetItem._id}`;

  if (!targetItem) return null;

  return (
    <div className="card p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-700/50 pb-3 mb-4">
          <span className="text-xs text-surface-400 font-medium">
            {t('claimCard.submitted', { time: formatRelativeTime(claim.createdAt) })}
          </span>
          <StatusBadge status={claim.status} />
        </div>

        {/* Claim Details */}
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {itemTypeLabel}
            </span>
            <Link to={itemUrl} className="flex items-center gap-1.5 hover:text-primary-500 transition-colors">
              <h5 className="text-sm font-bold text-surface-900 dark:text-white">
                {targetItem.itemName}
              </h5>
              <FiExternalLink className="text-xs" />
            </Link>
          </div>

          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {t('claimCard.claimantProfile')}
            </span>
            <div className="text-xs text-surface-700 dark:text-surface-300 space-y-1 mt-1">
              <p className="font-semibold flex items-center gap-1.5"><User size={12} className="text-surface-400" /> {claimant?.fullName || claimant?.name} ({claimant?.studentId})</p>
              {(canReview || isAdmin || claim.status === 'approved' || claim.isContactShared) && (
                <>
                  <p className="flex items-center gap-1.5"><FiExternalLink className="text-[10px]" /> {claimant?.email}</p>
                  {claimant?.phone && <p className="flex items-center gap-1.5"><FiExternalLink className="text-[10px]" /> {claimant?.phone}</p>}
                </>
              )}
            </div>
          </div>

          {/* Show item owner's contact details if contact is shared or approved, or if user is admin */}
          {(isAdmin || claim.status === 'approved' || claim.isContactShared) && itemOwner && (
            <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-lg">
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide block mb-1">
                {t('claimCard.posterContact')}
              </span>
              <div className="text-xs text-surface-700 dark:text-surface-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5"><User size={12} className="text-surface-400" /> {itemOwner?.fullName || itemOwner?.name}</p>
                <p className="flex items-center gap-1.5"><FiExternalLink className="text-[10px]" /> {itemOwner?.email}</p>
                {itemOwner?.phone && <p className="flex items-center gap-1.5"><FiExternalLink className="text-[10px]" /> {itemOwner?.phone}</p>}
              </div>
            </div>
          )}

          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {t('claimCard.proofStatement')}
            </span>
            <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed mt-1">
              {claim.proofDescription}
            </p>
          </div>

          {/* Proof Images if provided */}
          {claim.proofImages && claim.proofImages.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide block mb-1.5">
                {t('claimCard.proofPhotos', { count: claim.proofImages.length })}
              </span>
              <div className="flex gap-2">
                {claim.proofImages.map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden flex-shrink-0"
                  >
                    <img
                      src={img.url}
                      alt={t('claimCard.proofAlt')}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <WorkflowTimeline type="claim" status={claim.status === 'approved' && targetItem.status === 'claimed' ? 'completed' : claim.status} contactShared={claim.isContactShared} className="mt-2" />

          {/* Admin response log */}
          {claim.status !== 'pending' && (
            <div className="mt-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-900/40 text-[11px] text-surface-600 dark:text-surface-400">
              <p>{t('claimCard.reviewedAt')} <strong>{new Date(claim.reviewedAt).toLocaleDateString()}</strong></p>
              {claim.adminRemark && (
                <p className="mt-1">{t('claimCard.remark')} <strong>{claim.adminRemark}</strong></p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Action Buttons */}
      {(isAdmin || canReview) && claim.status === 'pending' && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-surface-100 dark:border-surface-700/50 justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(claim._id, 'rejected')}
            disabled={isLoading}
            icon={<FiX />}
            className="text-red-500 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            {t('claimCard.reject')}
          </Button>
          {!claim.isContactShared ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShareContact && onShareContact(claim._id)}
              disabled={isLoading}
              className="text-primary-600 border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              {t('claimCard.shareContact')}
            </Button>
          ) : (
            <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg border border-primary-100 dark:border-primary-800/50">
              <FiCheck /> {t('claimCard.contactShared')}
            </div>
          )}
          <Button
            variant="success"
            size="sm"
            onClick={() => onReview(claim._id, 'approved')}
            disabled={isLoading}
            icon={<FiCheck />}
          >
            {t('claimCard.confirmOwner')}
          </Button>
        </div>
      )}

      {/* Leave Feedback Action for Approved Claims */}
      {!isAdmin && claim.status === 'approved' && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-surface-100 dark:border-surface-700/50 justify-end flex-wrap">
          {targetItem.status === 'in_progress' && onResolve && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onResolve(targetItem._id, itemType, canReview)}
              disabled={isLoading}
            >
              {canReview
                ? (itemType === 'Found Item' ? t('claimCard.confirmHandover') : t('claimCard.confirmReceived'))
                : (itemType === 'Found Item' ? t('claimCard.confirmReceived') : t('claimCard.confirmHandover'))}
            </Button>
          )}
          {onFeedback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFeedback(claim)}
              icon={<FiMessageSquare />}
              className="text-amber-600 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:text-amber-400"
            >
              {t('claimCard.leaveFeedback')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaimCard;
//

