// ============================================
// Claim Card Component
// Displays item claim details and actions
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { FiExternalLink, FiCheck, FiX } from 'react-icons/fi';
import { formatRelativeTime } from '../../utils/formatDate';

export const ClaimCard = ({ claim, onReview, isAdmin = false, isLoading = false }) => {
  const claimant = claim.claimantId;
  const foundItem = claim.foundItemId;
  
  if (!foundItem) return null;

  return (
    <div className="card p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-700/50 pb-3 mb-4">
          <span className="text-xs text-surface-400 font-medium">
            Submitted {formatRelativeTime(claim.createdAt)}
          </span>
          <StatusBadge status={claim.status} />
        </div>

        {/* Claim Details */}
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              Found Item
            </span>
            <Link to={`/found-items/${foundItem._id}`} className="flex items-center gap-1.5 hover:text-primary-500 transition-colors">
              <h5 className="text-sm font-bold text-surface-900 dark:text-white">
                {foundItem.itemName}
              </h5>
              <FiExternalLink className="text-xs" />
            </Link>
          </div>

          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              Claimant Profile
            </span>
            <p className="text-xs font-semibold text-surface-700 dark:text-surface-300">
              👤 {claimant?.fullName} ({claimant?.studentId})
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              Proof Statement
            </span>
            <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed mt-1">
              {claim.proofDescription}
            </p>
          </div>

          {/* Proof Images if provided */}
          {claim.proofImages && claim.proofImages.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wide block mb-1.5">
                Proof Photos ({claim.proofImages.length})
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
                      alt="Proof"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin response log */}
          {claim.status !== 'pending' && (
            <div className="mt-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-900/40 text-[11px] text-surface-600 dark:text-surface-400">
              <p>Reviewed At: <strong>{new Date(claim.reviewedAt).toLocaleDateString()}</strong></p>
              {claim.adminRemark && (
                <p className="mt-1">Remark: <strong>{claim.adminRemark}</strong></p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Review Action Buttons */}
      {isAdmin && claim.status === 'pending' && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-surface-100 dark:border-surface-700/50 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(claim._id, 'rejected')}
            disabled={isLoading}
            icon={<FiX />}
            className="text-red-500 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            Reject
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => onReview(claim._id, 'approved')}
            disabled={isLoading}
            icon={<FiCheck />}
          >
            Approve
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClaimCard;
// 

