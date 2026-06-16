// ============================================
// Public Lost Items Directory Page
// Search queries, category dropdowns, and paginated lists
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLostItems, clearLostItemsList } from '../../redux/slices/lostItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import { useDebounce } from '../../hooks/useDebounce';
import SearchFilter from '../../components/common/SearchFilter';
import ItemCard from '../../components/cards/ItemCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';

export const LostItems = () => {
  const dispatch = useDispatch();

  const { items, pagination, isLoading, error } = useSelector((state) => state.lostItems);
  const { categories } = useSelector((state) => state.categories);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search query to avoid API spam
  const debouncedSearch = useDebounce(search, 500);

  // Fetch Categories on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Clear list on unmount
  useEffect(() => {
    return () => {
      dispatch(clearLostItemsList());
    };
  }, [dispatch]);

  // Fetch Items when filter states or page changes
  useEffect(() => {
    const params = {
      page,
      limit: 9,
      search: debouncedSearch,
      category,
      status,
      startDate,
      endDate
    };
    dispatch(fetchLostItems(params));
  }, [dispatch, page, debouncedSearch, category, status, startDate, endDate]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'matched', label: 'Matched' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'closed', label: 'Closed' }
  ];

  return (
    <div className="flex-1 pt-4 pb-8 sm:pt-6 sm:pb-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-7xl mx-auto">
        
        {/* Header & Search/Filter Container */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          {/* Header */}
          <div className="page-header flex-shrink-0">
            <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
              Lost Property Directory
            </h1>
            <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
              Search or filter through items reported lost on campus
            </p>
          </div>

          {/* Search & Filters */}
          <div className="w-full xl:w-auto xl:max-w-4xl flex-1">
            <SearchFilter
              search={search}
              onSearchChange={(val) => { setSearch(val); setPage(1); }}
              category={category}
              onCategoryChange={(val) => { setCategory(val); setPage(1); }}
              status={status}
              onStatusChange={(val) => { setStatus(val); setPage(1); }}
              startDate={startDate}
              onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
              endDate={endDate}
              onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
              categories={categories}
              statusOptions={statusOptions}
              onClear={handleClearFilters}
            />
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <Loader fullPage />
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-500 rounded-xl max-w-lg mx-auto text-center border border-red-200">
            ⚠️ Error: {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No lost reports match your criteria"
            description="Adjust your search terms or filters above to view other reported property."
            actionText="Clear Filters"
            onAction={handleClearFilters}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <ItemCard key={item._id} item={item} type="lost" />
              ))}
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </>
        )}

      </div>
    </div>
  );
};

export default LostItems;

