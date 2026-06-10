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
  const categoryOptions = categories.map((cat) => ({
    value: cat.name,
    label: `${cat.icon} ${cat.name}`
  }));

  return (
    <div className="glass-card mb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Input
            placeholder="Search items by name, details..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
            icon={<FiSearch className="text-surface-400" />}
          />
        </div>

        {/* Category Dropdown */}
        <Select
          placeholder="All Categories"
          options={categoryOptions}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        />

        {/* Status Dropdown */}
        <Select
          placeholder="All Statuses"
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        />

        {/* Clear Filters Link */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClear}
            className="text-sm font-semibold text-primary-500 hover:text-primary-600 dark:text-primary-400"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Date Pickers */}
      <div className="flex flex-wrap gap-4 mt-4 items-center">
        <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
          <FiCalendar /> Date Range:
        </span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 text-surface-700 dark:text-surface-300 focus:outline-none"
          placeholder="Start Date"
        />
        <span className="text-xs text-surface-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 text-surface-700 dark:text-surface-300 focus:outline-none"
          placeholder="End Date"
        />
      </div>
    </div>
  );
};

export default SearchFilter;

