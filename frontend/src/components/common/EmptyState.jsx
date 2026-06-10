// ============================================
// Empty State Component
// Displayed when no data is available in lists
// ============================================

import React from 'react';
import { FiInbox } from 'react-icons/fi';
import Button from './Button';

export const EmptyState = ({
  title = 'No items found',
  description = 'Try adjusting your search filters or check back later.',
  actionText,
  onAction,
  icon = <FiInbox className="text-5xl text-surface-400" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-surface-200 dark:border-surface-700/50 rounded-2xl bg-white/40 dark:bg-surface-800/10 backdrop-blur-sm max-w-lg mx-auto my-6">
      <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold font-display text-surface-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="outline" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
