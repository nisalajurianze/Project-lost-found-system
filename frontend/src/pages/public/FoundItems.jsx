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
import { Link } from 'react-router-dom';
import { FiPlusCircle } from 'react-icons/fi';

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
    <div className="flex-1 pt-4 pb-8 sm:pt-6 sm:pb-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-7xl mx-auto">
        
        {/* Header & Button Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header flex-shrink-0">
            <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
              Found Property Directory
            </h1>
            <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
              Search or filter through items found on campus
            </p>
          </div>
          <Link 
            to="/dashboard/report-found" 
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <FiPlusCircle className="text-lg" />
            Report Found Item
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="w-full mb-8 bg-white dark:bg-surface-800 p-4 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700">
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

