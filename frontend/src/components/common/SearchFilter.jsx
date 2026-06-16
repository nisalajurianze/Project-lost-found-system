// ============================================
// Search Filter Component
// Query bars, category selectors, and date pickers
// ============================================

import React from 'react';
import { FiSearch, FiCalendar } from 'react-icons/fi';
import Input from './Input';
import Select from './Select';

export const SearchFilter = ({
  search = '',
  onSearchChange,
  category = '',
  onCategoryChange,
  status = '',
  onStatusChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  categories = [],
  statusOptions = [],
  onClear
}) => {
  const [localSearch, setLocalSearch] = React.useState(search);

  // Sync local state if search prop changes (e.g., Clear Filters)
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce local search changes
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  const categoryOptions = categories.map((cat) => ({
    value: cat.name,
    label: `${cat.icon} ${cat.name}`
  }));

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Row: Search & Dropdowns */}
      <div className="flex flex-col md:flex-row gap-3 w-full">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search items by name, details..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full shadow-sm"
            icon={<FiSearch className="text-surface-400" />}
          />
        </div>

        {/* Dropdowns & Actions Row */}
        <div className="flex flex-row gap-3 overflow-x-auto pb-1 md:pb-0 items-center">
          <div className="w-40 flex-shrink-0">
            <Select
              placeholder="All Categories"
              options={categoryOptions}
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            />
          </div>

          <div className="w-36 flex-shrink-0">
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            />
          </div>

          <button
            onClick={onClear}
            className="text-xs font-bold text-surface-500 hover:text-primary-500 dark:text-surface-400 dark:hover:text-primary-400 whitespace-nowrap px-2 transition-colors duration-200 uppercase tracking-wider"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bottom Row: Date Pickers */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700/50 p-1.5 shadow-sm">
          <div className="flex items-center justify-center px-2 text-surface-400">
            <FiCalendar className="w-4 h-4" />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="text-xs bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer w-28"
            title="Start Date"
          />
          <span className="text-surface-300 dark:text-surface-600">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="text-xs bg-transparent border-none text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-0 cursor-pointer w-28 pr-2"
            title="End Date"
          />
        </div>
      </div>
    </div>
  );
};

export default SearchFilter;


