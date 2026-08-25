import React from 'react';
import { FiSearch, FiCalendar, FiX } from 'react-icons/fi';
import Input from './Input';
import Select from './Select';
import { useLanguage } from '../../i18n/LanguageContext';

export const SearchFilter = ({
  search = '', onSearchChange, category = '', onCategoryChange, status = '', onStatusChange,
  startDate = '', onStartDateChange, endDate = '', onEndDateChange,
  categories = [], statusOptions = [], onClear,
}) => {
  const { t } = useLanguage();
  const [localSearch, setLocalSearch] = React.useState(search);

  React.useEffect(() => setLocalSearch(search), [search]);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  const categoryOptions = categories.map((cat) => {
    if (cat.label && cat.value !== undefined) return cat;
    return { value: cat.name || cat, label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name || cat };
  });

  const hasActiveFilters = Boolean(search || category || status || startDate || endDate);

  return (
    <div className="w-full flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center justify-start gap-2.5 bg-surface-50/50 dark:bg-surface-900/40 p-2.5 sm:p-3 rounded-2xl border border-surface-200/80 dark:border-surface-800/80 shadow-xs">
      <div className="flex-1 min-w-[220px] lg:min-w-[280px]">
        <Input
          aria-label={t('filters.searchPlaceholder')}
          placeholder={t('filters.searchPlaceholder')}
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          className="w-full text-sm"
          icon={<FiSearch className="text-surface-400" />}
        />
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 sm:flex-initial">
        <div className="min-w-[170px] flex-1 sm:flex-none">
          <Select
            aria-label={t('filters.allCategories')}
            placeholder={t('filters.allCategories')}
            options={categoryOptions}
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
          />
        </div>
        <div className="min-w-[150px] flex-1 sm:flex-none">
          <Select
            aria-label={t('filters.allStatuses')}
            placeholder={t('filters.allStatuses')}
            options={statusOptions}
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          />
        </div>
      </div>

      {(onStartDateChange || onEndDateChange) && (
        <div className="flex items-center gap-1.5 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700/60 px-2.5 py-0.5 shadow-xs">
          <FiCalendar className="w-3.5 h-3.5 text-surface-400 shrink-0" aria-hidden="true" />
          <input
            aria-label={t('filters.startDate')}
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange?.(event.target.value)}
            className="min-h-11 text-sm bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer min-w-[85px]"
            title={t('filters.startDate')}
          />
          <span className="text-surface-300 dark:text-surface-600 text-xs" aria-hidden="true">–</span>
          <input
            aria-label={t('filters.endDate')}
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange?.(event.target.value)}
            className="min-h-11 text-sm bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer min-w-[85px]"
            title={t('filters.endDate')}
          />
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-1 h-9 px-3 text-xs font-semibold text-surface-500 hover:text-red-500 dark:text-surface-400 dark:hover:text-red-400 bg-surface-100 hover:bg-red-50 dark:bg-surface-800 dark:hover:bg-red-950/30 rounded-xl border border-surface-200 dark:border-surface-700 transition-all duration-200 shrink-0"
        >
          <FiX className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('filters.clear')}</span>
        </button>
      )}
    </div>
  );
};

export default SearchFilter;
