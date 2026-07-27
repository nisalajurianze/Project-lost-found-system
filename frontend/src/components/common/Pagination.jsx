import React from 'react';
import Button from './Button';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export const Pagination = ({ page = 1, totalPages = 1, onPageChange, hasNextPage, hasPrevPage }) => {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;
  const canGoPrev = hasPrevPage !== undefined ? hasPrevPage : page > 1;
  const canGoNext = hasNextPage !== undefined ? hasNextPage : page < totalPages;

  return (
    <nav aria-label={t('pagination.pageOf', { page, total: totalPages })} className="flex items-center justify-between mt-8 p-4 bg-white/40 dark:bg-surface-800/10 backdrop-blur-sm rounded-xl border border-surface-200/50 dark:border-surface-700/50">
      <div className="text-sm font-medium text-surface-500 dark:text-surface-400">{t('pagination.pageOf', { page, total: totalPages })}</div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!canGoPrev} onClick={() => onPageChange(page - 1)} icon={<FiChevronLeft aria-hidden="true" />}>{t('pagination.previous')}</Button>
        <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => onPageChange(page + 1)} icon={<FiChevronRight aria-hidden="true" />}>{t('pagination.next')}</Button>
      </div>
    </nav>
  );
};

export default Pagination;
