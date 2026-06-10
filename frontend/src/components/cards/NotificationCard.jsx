// ============================================
// Notification Card Component
// Layout representation of user in-app notifications
// ============================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiCheckCircle, FiAlertCircle, FiAward, FiInbox, FiBell } from 'react-icons/fi';
import { formatRelativeTime } from '../../utils/formatDate';

export const NotificationCard = ({ notification, onRead, onDelete }) => {
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'match_found':
        return <FiAward className="text-xl text-primary-500" />;
      case 'claim_submitted':
        return <FiInbox className="text-xl text-amber-500" />;
      case 'claim_approved':
        return <FiCheckCircle className="text-xl text-emerald-500" />;
      case 'claim_rejected':
        return <FiAlertCircle className="text-xl text-red-500" />;
      default:
        return <FiBell className="text-xl text-surface-400" />;
    }
  };

  const handleCardClick = () => {
    // Mark as read first
    if (!notification.isRead) {
      onRead(notification._id);
    }

    // Determine redirection if there is a related item reference
    const ref = notification.relatedItem;
    if (ref && ref.itemId) {
      if (ref.itemType === 'Match') {
        navigate('/dashboard/my-matches');
      } else if (ref.itemType === 'ClaimRequest') {
        navigate('/dashboard/my-claims');
      } else if (ref.itemType === 'LostItem') {
        navigate(`/lost-items/${ref.itemId}`);
      } else if (ref.itemType === 'FoundItem') {
        navigate(`/found-items/${ref.itemId}`);
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
        notification.isRead
          ? 'bg-white/40 dark:bg-surface-800/10 border-surface-200/50 dark:border-surface-800/50 hover:bg-white/80 dark:hover:bg-surface-800/20'
          : 'bg-primary-500/5 border-primary-500/10 hover:bg-primary-500/10 shadow-sm'
      }`}
    >
      {/* Read/Unread circle indicator */}
      {!notification.isRead && (
        <span className="absolute top-4 left-4 h-2.5 w-2.5 bg-primary-500 rounded-full" />
      )}

      {/* Icon */}
      <div className={`p-2.5 rounded-lg flex-shrink-0 flex items-center justify-center ${
        notification.isRead ? 'bg-surface-100 dark:bg-surface-800' : 'bg-primary-500/10'
      } ${!notification.isRead ? 'ml-4' : ''}`}>
        {getIcon(notification.type)}
      </div>

      {/* Text Details */}
      <div className="flex-1 min-w-0 pr-6">
        <h5 className="text-sm font-bold text-surface-900 dark:text-white truncate">
          {notification.title}
        </h5>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
          {notification.message}
        </p>
        <span className="text-[10px] text-surface-400 dark:text-surface-500 font-semibold block mt-2">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Avoid triggering card click redirection
          onDelete(notification._id);
        }}
        className="absolute top-4 right-4 p-1 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-white transition-colors"
      >
        <FiX className="text-sm" />
      </button>
    </div>
  );
};

export default NotificationCard;
// 

