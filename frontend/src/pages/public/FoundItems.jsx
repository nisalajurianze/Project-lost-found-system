// ============================================
// Public Found Items Directory Page
// Search queries, category dropdowns, and paginated lists
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFoundItems, clearFoundItemsList } from '../../redux/slices/foundItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import { useDebounce } from '../../hooks/useDebounce';
import SearchFilter from '../../components/common/SearchFilter';
import ItemCard from '../../components/cards/ItemCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';

export const FoundItems = () => {
  const dispatch = useDispatch();

  const { items, pagination, isLoading, error } = useSelector((state) => state.foundItems);
  const { categories } = useSelector((state) => state.categories);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // Fetch Categories on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Clear list on unmount
  useEffect(() => {
    return () => {
      dispatch(clearFoundItemsList());
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
    dispatch(fetchFoundItems(params));
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
    { value: 'available', label: 'Available' },
    { value: 'matched', label: 'Matched' },
    { value: 'claimed', label: 'Claimed' }
  ];

  return (
    <div className="flex-1 py-8 sm:py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
            Found Property Directory
          </h1>
          <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
            Search or filter through items reported found on campus
          </p>
        </div>

        {/* Search & Filters */}
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

        {/* Listings Grid */}
        {isLoading ? (
          <Loader fullPage />
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-500 rounded-xl max-w-lg mx-auto text-center border border-red-200">
            ⚠️ Error: {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No found items match your criteria"
            description="Adjust your search terms or filters above to view other reported property."
            actionText="Clear Filters"
            onAction={handleClearFilters}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <ItemCard key={item._id} item={item} type="found" />
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

export default FoundItems;

