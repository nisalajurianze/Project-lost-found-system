import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiBookmark, FiGrid, FiList, FiPlay, FiSearch, FiTrash2, FiX, FiPlusCircle, FiSliders, FiChevronDown, FiCheck } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import lostItemService from '../../services/lostItemService';
import foundItemService from '../../services/foundItemService';
import categoryService from '../../services/categoryService';
import ItemCard from '../../components/cards/ItemCard';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../i18n/LanguageContext';
import { getCategoryIcon } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { deleteSavedSearch, loadSavedSearches, sanitizeSearchFilters, saveSearch } from '../../utils/savedSearches';

const CustomDropdown = ({ label, value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`min-h-11 h-11 w-full flex items-center justify-between gap-2 rounded-xl border px-3 text-xs font-medium transition-all ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-sm'
            : 'border-surface-200 bg-surface-50 text-surface-800 hover:bg-surface-100/80 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-800'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="text-sm shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <FiChevronDown className={`text-surface-400 text-xs shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full min-w-[210px] max-h-60 overflow-y-auto rounded-2xl border border-surface-200/90 dark:border-surface-700/90 bg-white dark:bg-surface-900 p-1.5 shadow-2xl backdrop-blur-md animate-fade-in"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || 'all'}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-all ${
                  isSelected
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                    : 'text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800/80'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {option.icon && <span className="text-sm shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </span>
                {isSelected && <FiCheck className="text-primary-600 dark:text-primary-400 text-sm shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PAGE_SIZE = 12;
const normalizeResponse = (response, type) => (response?.items || []).map((item) => ({ ...item, _searchType: type }));

export const SearchItems = () => {
  const { t } = useLanguage();
  const principalId = useSelector((state) => state.auth.user?._id) || 'guest';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = sanitizeSearchFilters({
    query: searchParams.get('q'),
    type: searchParams.get('type'),
    category: searchParams.get('category'),
    startDate: searchParams.get('from'),
    endDate: searchParams.get('to'),
    sort: searchParams.get('sort'),
  });
  const [query, setQuery] = useState(initialFilters.query);
  const [type, setType] = useState(initialFilters.type);
  const [category, setCategory] = useState(initialFilters.category);
  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [sort, setSort] = useState(initialFilters.sort);
  const [view, setView] = useState(() => window.localStorage.getItem('lf-search-view') || 'grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedSearches, setSavedSearches] = useState([]);
  const debouncedQuery = useDebounce(query, 450);

  useEffect(() => { categoryService.getCategories().then((data) => setCategories(data?.categories || data || [])).catch(() => setCategories([])); }, []);
  useEffect(() => { setSavedSearches(loadSavedSearches({ principalId })); }, [principalId]);
  useEffect(() => { window.localStorage.setItem('lf-search-view', view); }, [view]);
  useEffect(() => { setPage(1); }, [debouncedQuery, type, category, startDate, endDate, sort]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set('q', debouncedQuery);
    if (type !== 'both') next.set('type', type);
    if (category) next.set('category', category);
    if (startDate) next.set('from', startDate);
    if (endDate) next.set('to', endDate);
    if (sort !== '-createdAt') next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }, [category, debouncedQuery, endDate, setSearchParams, sort, startDate, type]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true); setError('');
      const params = { search: debouncedQuery, category, startDate, endDate, sort, page, limit: PAGE_SIZE };
      try {
        const requests = [];
        if (type !== 'found') requests.push(lostItemService.getLostItems(params).then((response) => ({ response, type: 'lost' })));
        if (type !== 'lost') requests.push(foundItemService.getFoundItems(params).then((response) => ({ response, type: 'found' })));
        const settled = await Promise.all(requests);
        if (!active) return;
        const combined = settled.flatMap(({ response, type: reportType }) => normalizeResponse(response, reportType));
        combined.sort((a, b) => sort === 'createdAt' ? new Date(a.createdAt) - new Date(b.createdAt) : sort === 'itemName' ? String(a.itemName).localeCompare(String(b.itemName)) : new Date(b.createdAt) - new Date(a.createdAt));
        setResults((current) => page === 1 ? combined : [...current, ...combined.filter((next) => !current.some((item) => item._id === next._id && item._searchType === next._searchType))]);
        setTotal(settled.reduce((sum, { response }) => sum + Number(response?.pagination?.totalDocs || response?.items?.length || 0), 0));
      } catch (loadError) {
        if (active) { setError(loadError?.response?.data?.message || t('search.error')); if (page === 1) setResults([]); }
      } finally { if (active) setIsLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [debouncedQuery, type, category, startDate, endDate, sort, page, t]);

  const activeFilters = useMemo(() => [
    debouncedQuery && { key: 'query', label: `"${debouncedQuery}"` },
    type !== 'both' && { key: 'type', label: t(type === 'lost' ? 'search.lost' : 'search.found') },
    category && { key: 'category', label: `${categories.find((c) => c.name === category)?.icon || getCategoryIcon(category)} ${category}` },
    startDate && { key: 'startDate', label: `From: ${startDate}` },
    endDate && { key: 'endDate', label: `To: ${endDate}` }
  ].filter(Boolean), [debouncedQuery, type, category, categories, startDate, endDate, t]);

  const clearFilter = (key) => {
    if (key === 'query') setQuery('');
    if (key === 'type') setType('both');
    if (key === 'category') setCategory('');
    if (key === 'startDate') setStartDate('');
    if (key === 'endDate') setEndDate('');
  };

  const clearAll = () => { setQuery(''); setType('both'); setCategory(''); setStartDate(''); setEndDate(''); setSort('-createdAt'); };
  const currentFilters = { query: debouncedQuery, type, category, startDate, endDate, sort };
  const canSaveSearch = Boolean(debouncedQuery || type !== 'both' || category || startDate || endDate || sort !== '-createdAt');

  const handleSaveSearch = () => {
    if (!canSaveSearch) return;
    setSavedSearches(saveSearch(currentFilters, { principalId }));
    toast.success(t('search.savedSuccess'));
  };

  const applySavedSearch = (saved) => {
    const filters = sanitizeSearchFilters(saved.filters);
    setQuery(filters.query); setType(filters.type); setCategory(filters.category); setStartDate(filters.startDate); setEndDate(filters.endDate); setSort(filters.sort); setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeSavedSearch = (id) => setSavedSearches(deleteSavedSearch(id, { principalId }));
  const hasMore = results.length < total;
  const filterCount = (category ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0) + (sort !== '-createdAt' ? 1 : 0);

  const categoryDropdownOptions = useMemo(() => [
    { value: '', label: t('search.allCategories'), icon: '📁' },
    ...categories.map((entry) => ({
      value: entry.name,
      label: entry.name,
      icon: entry.icon || getCategoryIcon(entry.name)
    }))
  ], [categories, t]);

  const sortDropdownOptions = useMemo(() => [
    { value: '-createdAt', label: t('search.newest'), icon: '✨' },
    { value: 'createdAt', label: t('search.oldest'), icon: '⏳' },
    { value: 'itemName', label: t('search.name'), icon: '🔤' }
  ], [t]);

  return (
    <div className="flex-1 bg-surface-50 pt-3 pb-10 dark:bg-surface-900">
      <div className="page-container mx-auto max-w-screen-2xl px-4 sm:px-6">
        
        {/* Sleek Compact Header */}
        <div className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-surface-900 dark:text-white">
              {t('search.title')}
            </h1>
            <span className="rounded-full bg-primary-100 dark:bg-primary-950/70 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:text-primary-300">
              {isLoading && page === 1 ? '...' : total}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <Link to="/dashboard/report-lost" className="btn btn-outline btn-sm min-h-11 text-xs border-rose-200/90 bg-rose-50/40 text-rose-700 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/40 font-semibold shadow-none justify-center">
              <FiPlusCircle className="text-rose-500" />
              <span>{t('nav.reportLost')}</span>
            </Link>
            <Link to="/dashboard/report-found" className="btn btn-primary btn-sm min-h-11 text-xs !bg-emerald-50/60 hover:!bg-emerald-100/70 !border !border-emerald-200/90 hover:!border-emerald-300 !text-emerald-700 dark:!bg-emerald-950/30 dark:hover:!bg-emerald-950/50 dark:!border-emerald-800/50 dark:!text-emerald-300 font-semibold shadow-none justify-center">
              <FiPlusCircle className="text-emerald-600 dark:text-emerald-400" />
              <span>{t('nav.reportFound')}</span>
            </Link>
          </div>
        </div>

        {/* Unified Search & Control Bar */}
        <section aria-label={t('common.search')} className="rounded-2xl border border-surface-200/80 bg-white p-2.5 shadow-sm dark:border-surface-800 dark:bg-surface-950">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            
            {/* Search Input Box */}
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-base" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={200}
                placeholder={t('search.placeholder')}
                className="min-h-11 h-11 w-full rounded-xl border border-surface-200 bg-surface-50/70 pl-10 pr-9 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-surface-700 dark:bg-surface-900/80 dark:text-white dark:focus:bg-surface-900 dark:focus:ring-primary-950 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('search.clear')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Quick Segmented Type Selector */}
            <div className="grid grid-cols-3 md:flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-900 rounded-xl">
              <button
                type="button"
                onClick={() => setType('both')}
                className={`inline-flex min-h-11 items-center justify-center px-3.5 text-xs font-bold rounded-lg transition-all ${type === 'both' ? 'bg-white dark:bg-surface-800 text-primary-600 dark:text-primary-300 shadow-xs' : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'}`}
              >
                {t('search.both')}
              </button>
              <button
                type="button"
                onClick={() => setType('lost')}
                className={`inline-flex min-h-11 items-center justify-center px-3.5 text-xs font-bold rounded-lg transition-all ${type === 'lost' ? 'bg-rose-500 text-white shadow-xs' : 'text-surface-600 dark:text-surface-400 hover:text-rose-600'}`}
              >
                {t('search.lost')}
              </button>
              <button
                type="button"
                onClick={() => setType('found')}
                className={`inline-flex min-h-11 items-center justify-center px-3.5 text-xs font-bold rounded-lg transition-all ${type === 'found' ? 'bg-emerald-600 text-white shadow-xs' : 'text-surface-600 dark:text-surface-400 hover:text-emerald-600'}`}
              >
                {t('search.found')}
              </button>
            </div>

            {/* Hidden native select for accessibility and test match */}
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="sr-only"
              aria-label={t('search.type')}
            >
              <option value="both">{t('search.both')}</option>
              <option value="lost">{t('search.lost')}</option>
              <option value="found">{t('search.found')}</option>
            </select>

            {/* Controls Cluster */}
            <div className="flex items-center gap-2 shrink-0 justify-between md:justify-end">
              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex min-h-11 items-center gap-1.5 px-3.5 rounded-xl border text-xs font-bold transition-all ${
                  showFilters || filterCount > 0
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 dark:border-primary-600'
                    : 'border-surface-200 text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800'
                }`}
              >
                <FiSliders className="text-sm" aria-hidden="true" />
                <span>{t('search.filters')}</span>
                {filterCount > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">
                    {filterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Bookmark Save Search */}
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  disabled={!canSaveSearch}
                  title={t('search.save')}
                  aria-label={t('search.save')}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:pointer-events-none dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800 transition-all"
                >
                  <FiBookmark aria-hidden="true" />
                </button>

                {/* Grid / List Switcher */}
                <div className="flex items-center rounded-xl border border-surface-200 dark:border-surface-700 p-0.5 bg-surface-50 dark:bg-surface-900">
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    aria-label={t('search.grid')}
                    aria-pressed={view === 'grid'}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-all ${
                      view === 'grid'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
                    }`}
                  >
                    <FiGrid size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    aria-label={t('search.list')}
                    aria-pressed={view === 'list'}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-all ${
                      view === 'list'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
                    }`}
                  >
                    <FiList size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Advanced Filters Drawer */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800/80 animate-fade-in">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <CustomDropdown
                    label={t('search.category')}
                    value={category}
                    options={categoryDropdownOptions}
                    onChange={setCategory}
                    placeholder={t('search.allCategories')}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1">
                    {t('search.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="min-h-11 h-11 w-full rounded-xl border border-surface-200 bg-surface-50 px-3 text-xs font-medium text-surface-800 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1">
                    {t('search.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="min-h-11 h-11 w-full rounded-xl border border-surface-200 bg-surface-50 px-3 text-xs font-medium text-surface-800 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <CustomDropdown
                    label={t('search.sort')}
                    value={sort}
                    options={sortDropdownOptions}
                    onChange={setSort}
                    placeholder={t('search.newest')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-surface-100 dark:border-surface-800/80 flex flex-wrap items-center gap-1.5 text-xs" aria-label={t('search.filters')}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mr-1">
                Active:
              </span>
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => clearFilter(filter.key)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
                >
                  <span>{filter.label}</span>
                  <FiX className="text-xs opacity-70" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="px-2 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
              >
                {t('search.clear')}
              </button>
            </div>
          )}
        </section>

        {/* Compact Saved Searches Pill Row */}
        {savedSearches.length > 0 && (
          <section className="mt-2.5 flex items-center gap-2 overflow-x-auto py-1 scrollbar-none" aria-labelledby="saved-searches-title">
            <span id="saved-searches-title" className="shrink-0 text-xs font-bold text-surface-500 dark:text-surface-400 flex items-center gap-1">
              <FiBookmark className="text-primary-500" />
              {t('search.saved')}:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className="inline-flex items-center rounded-lg border border-surface-200 bg-white pl-2.5 pr-1 py-1 text-xs shadow-2xs dark:border-surface-700 dark:bg-surface-800/90 whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => applySavedSearch(saved)}
                    className="flex items-center gap-1.5 font-medium text-surface-800 dark:text-surface-200 hover:text-primary-600 dark:hover:text-primary-300"
                  >
                    <FiPlay className="text-[10px] text-primary-600" aria-hidden="true" />
                    <span className="max-w-[120px] truncate">{saved.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedSearch(saved.id)}
                    className="ml-1.5 flex h-5 w-5 items-center justify-center rounded text-surface-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    aria-label={`${t('search.delete')}: ${saved.title}`}
                  >
                    <FiTrash2 className="text-[11px]" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results Stream / Feed (Appears right below controls!) */}
        <main className="mt-4">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : !isLoading && results.length === 0 ? (
            <div className="rounded-2xl border border-surface-200 bg-white p-12 text-center dark:border-surface-800 dark:bg-surface-950">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400">
                <FiSearch className="text-xl" />
              </div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('search.none')}</h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-surface-500 dark:text-surface-400">{t('search.noneDesc')}</p>
              <button type="button" onClick={clearAll} className="btn btn-primary btn-sm mt-4">
                {t('search.clear')}
              </button>
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid gap-3'}>
              {results.map((item) => (
                <ItemCard key={`${item._searchType}-${item._id}`} item={item} type={item._searchType} view={view} />
              ))}
            </div>
          )}

          {isLoading && page > 1 && (
            <p className="mt-6 text-center text-sm font-semibold text-surface-500" role="status">
              {t('search.loading')}
            </p>
          )}

          {hasMore && !isLoading && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setPage((current) => current + 1)} className="btn btn-primary btn-md">
                {t('search.loadMore')}
              </button>
            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default SearchItems;
