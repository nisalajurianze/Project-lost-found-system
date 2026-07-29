import React from 'react';
import { FiSearch, FiCalendar } from 'react-icons/fi';
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
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  const categoryOptions = categories.map((cat) => {
    if (cat.label && cat.value !== undefined) return cat;
    return { value: cat.name || cat, label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name || cat };
  });

  return (
    <div className="w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start gap-3">
      <div className="w-full sm:flex-1 sm:min-w-[200px] lg:max-w-[300px]">
        <Input aria-label={t('filters.searchPlaceholder')} placeholder={t('filters.searchPlaceholder')} value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} className="w-full shadow-sm" icon={<FiSearch className="text-surface-400" />} />
      </div>
      <div className="flex flex-row gap-3 w-full sm:w-auto">
        <div className="flex-1 sm:w-[160px] sm:flex-none">
          <Select aria-label={t('filters.allCategories')} placeholder={t('filters.allCategories')} options={categoryOptions} value={category} onChange={(event) => onCategoryChange(event.target.value)} />
        </div>
        <div className="flex-1 sm:w-[140px] sm:flex-none">
          <Select aria-label={t('filters.allStatuses')} placeholder={t('filters.allStatuses')} options={statusOptions} value={status} onChange={(event) => onStatusChange(event.target.value)} />
        </div>
      </div>
      <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
        <div className="flex-1 sm:flex-none flex items-center justify-between gap-1 sm:gap-2 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700/50 p-1.5 shadow-sm">
          <div className="flex items-center justify-center px-1 text-surface-400"><FiCalendar className="w-4 h-4" aria-hidden="true" /></div>
          <input aria-label={t('filters.startDate')} type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="min-h-11 text-sm bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer flex-1 w-0 min-w-[70px]" title={t('filters.startDate')} />
          <span className="text-surface-300 dark:text-surface-600" aria-hidden="true">–</span>
          <input aria-label={t('filters.endDate')} type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} className="min-h-11 text-sm bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer flex-1 w-0 min-w-[70px] pr-1" title={t('filters.endDate')} />
        </div>
        <button type="button" onClick={onClear} className="min-h-11 text-sm font-bold text-surface-500 hover:text-primary-500 dark:text-surface-400 dark:hover:text-primary-400 whitespace-nowrap px-3 transition-colors duration-200 uppercase tracking-wider shrink-0">{t('filters.clear')}</button>
      </div>
    </div>
  );
};

export default SearchFilter;
