// ============================================
// Pagination Navigation Component
// Prev, page number counter, Next buttons
// ============================================

import React from 'react';
import Button from './Button';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export const Pagination = ({
  page = 1,
  totalPages = 1,
  onPageChange,
  hasNextPage,
  hasPrevPage
}) => {
  if (totalPages <= 1) return null;

  const canGoPrev = hasPrevPage !== undefined ? hasPrevPage : page > 1;
  const canGoNext = hasNextPage !== undefined ? hasNextPage : page < totalPages;

  return (
    <div className="flex items-center justify-between mt-8 p-4 bg-white/40 dark:bg-surface-800/10 backdrop-blur-sm rounded-xl border border-surface-200/50 dark:border-surface-700/50">
      <div className="text-xs font-medium text-surface-500 dark:text-surface-400">
        Page <span className="font-bold text-surface-900 dark:text-white">{page}</span> of{' '}
        <span className="font-bold text-surface-900 dark:text-white">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
          icon={<FiChevronLeft />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          icon={<FiChevronRight />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
// 

