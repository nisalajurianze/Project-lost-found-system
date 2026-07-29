import React, { useEffect, useMemo, useState } from 'react';
import { FiBookmark, FiGrid, FiList, FiPlay, FiSearch, FiTrash2, FiX, FiPlusCircle } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import lostItemService from '../../services/lostItemService';
import foundItemService from '../../services/foundItemService';
import categoryService from '../../services/categoryService';
import ItemCard from '../../components/cards/ItemCard';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { deleteSavedSearch, loadSavedSearches, sanitizeSearchFilters, saveSearch } from '../../utils/savedSearches';

const PAGE_SIZE = 12;
const normalizeResponse = (response, type) => (response?.items || []).map((item) => ({ ...item, _searchType: type }));

export const SearchItems = () => {
  const { t } = useLanguage();
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
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedSearches, setSavedSearches] = useState(() => loadSavedSearches());
  const debouncedQuery = useDebounce(query, 450);

  useEffect(() => { categoryService.getCategories().then((data) => setCategories(data?.categories || data || [])).catch(() => setCategories([])); }, []);
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

  const activeFilters = useMemo(() => [debouncedQuery && { key: 'query', label: debouncedQuery }, type !== 'both' && { key: 'type', label: t(type === 'lost' ? 'search.lost' : 'search.found') }, category && { key: 'category', label: category }, startDate && { key: 'startDate', label: startDate }, endDate && { key: 'endDate', label: endDate }].filter(Boolean), [debouncedQuery, type, category, startDate, endDate, t]);
  const clearFilter = (key) => { if (key === 'query') setQuery(''); if (key === 'type') setType('both'); if (key === 'category') setCategory(''); if (key === 'startDate') setStartDate(''); if (key === 'endDate') setEndDate(''); };
  const clearAll = () => { setQuery(''); setType('both'); setCategory(''); setStartDate(''); setEndDate(''); setSort('-createdAt'); };
  const currentFilters = { query: debouncedQuery, type, category, startDate, endDate, sort };
  const canSaveSearch = Boolean(debouncedQuery || type !== 'both' || category || startDate || endDate || sort !== '-createdAt');
  const handleSaveSearch = () => {
    if (!canSaveSearch) return;
    setSavedSearches(saveSearch(currentFilters));
    toast.success(t('search.savedSuccess'));
  };
  const applySavedSearch = (saved) => {
    const filters = sanitizeSearchFilters(saved.filters);
    setQuery(filters.query); setType(filters.type); setCategory(filters.category); setStartDate(filters.startDate); setEndDate(filters.endDate); setSort(filters.sort); setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const removeSavedSearch = (id) => setSavedSearches(deleteSavedSearch(id));
  const hasMore = results.length < total;

  return (
    <div className="flex-1 bg-surface-50 py-8 dark:bg-surface-900">
      <div className="page-container mx-auto max-w-screen-2xl">
        <header className="mb-6"><h1 className="text-3xl font-extrabold text-surface-900 dark:text-white">{t('search.title')}</h1><p className="mt-2 max-w-3xl text-base text-surface-600 dark:text-surface-300">{t('search.subtitle')}</p></header>
        <section aria-label={t('common.search')} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-800 dark:bg-surface-950">
          <div className="relative"><FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder={t('search.placeholder')} className="min-h-14 w-full rounded-xl border border-surface-300 bg-white pl-11 pr-11 text-base text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:ring-primary-950" />{query && <button type="button" onClick={() => setQuery('')} aria-label={t('search.clear')} className="absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg"><FiX aria-hidden="true" /></button>}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('search.type')}<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900"><option value="both">{t('search.both')}</option><option value="lost">{t('search.lost')}</option><option value="found">{t('search.found')}</option></select></label>
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('search.category')}<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900"><option value="">{t('search.allCategories')}</option>{categories.map((entry) => <option key={entry._id || entry.name} value={entry.name}>{entry.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('search.startDate')}<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900" /></label>
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('search.endDate')}<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900" /></label>
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('search.sort')}<select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900"><option value="-createdAt">{t('search.newest')}</option><option value="createdAt">{t('search.oldest')}</option><option value="itemName">{t('search.name')}</option></select></label>
            <div className="flex items-end gap-2"><button type="button" onClick={() => setView('grid')} aria-label={t('search.grid')} aria-pressed={view === 'grid'} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border ${view === 'grid' ? 'border-primary-600 bg-primary-600 text-white' : 'border-surface-300 dark:border-surface-700'}`}><FiGrid /></button><button type="button" onClick={() => setView('list')} aria-label={t('search.list')} aria-pressed={view === 'list'} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border ${view === 'list' ? 'border-primary-600 bg-primary-600 text-white' : 'border-surface-300 dark:border-surface-700'}`}><FiList /></button></div>
          </div>
          {activeFilters.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={t('search.filters')}>{activeFilters.map((filter) => <button key={filter.key} type="button" onClick={() => clearFilter(filter.key)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary-50 px-3 text-sm font-semibold text-primary-800 dark:bg-primary-950/50 dark:text-primary-200">{filter.label}<FiX aria-hidden="true" /></button>)}<button type="button" onClick={clearAll} className="min-h-11 px-2 text-sm font-bold text-primary-700 underline dark:text-primary-300">{t('search.clear')}</button></div>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-4 dark:border-surface-800">
            <p className="max-w-2xl text-xs text-surface-500 dark:text-surface-400">{t('search.savedNotice')}</p>
            <button type="button" onClick={handleSaveSearch} disabled={!canSaveSearch} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-300 px-4 text-sm font-bold text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-950/30"><FiBookmark aria-hidden="true" />{t('search.save')}</button>
          </div>
        </section>

        {savedSearches.length > 0 && (
          <section className="mt-4 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-950" aria-labelledby="saved-searches-title">
            <h2 id="saved-searches-title" className="text-base font-bold text-surface-900 dark:text-white">{t('search.saved')}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedSearches.map((saved) => (
                <li key={saved.id} className="flex items-stretch gap-2 rounded-xl border border-surface-200 p-2 dark:border-surface-700">
                  <button type="button" onClick={() => applySavedSearch(saved)} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left hover:bg-surface-50 dark:hover:bg-surface-800"><FiPlay className="shrink-0 text-primary-600" aria-hidden="true" /><span className="min-w-0"><strong className="block truncate text-sm">{saved.title}</strong><span className="block text-xs text-surface-500">{new Date(saved.updatedAt).toLocaleDateString()}</span></span></button>
                  <button type="button" onClick={() => removeSavedSearch(saved.id)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" aria-label={`${t('search.delete')}: ${saved.title}`}><FiTrash2 aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="my-6 flex flex-wrap items-center justify-between gap-3"><p role="status" className="font-semibold text-surface-700 dark:text-surface-200">{isLoading && page === 1 ? t('search.loading') : t('search.results', { count: total })}</p><div className="flex gap-2"><Link to="/dashboard/report-lost" className="btn btn-outline btn-sm min-h-11"><FiPlusCircle />{t('nav.reportLost')}</Link><Link to="/dashboard/report-found" className="btn btn-primary btn-sm min-h-11"><FiPlusCircle />{t('nav.reportFound')}</Link></div></div>
        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div> : !isLoading && results.length === 0 ? <div className="rounded-2xl border border-surface-200 bg-white p-10 text-center dark:border-surface-800 dark:bg-surface-950"><h2 className="text-xl font-bold">{t('search.none')}</h2><p className="mx-auto mt-2 max-w-2xl text-surface-500">{t('search.noneDesc')}</p><button type="button" onClick={clearAll} className="btn btn-primary btn-md mt-5">{t('search.clear')}</button></div> : <div className={view === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-4'}>{results.map((item) => <ItemCard key={`${item._searchType}-${item._id}`} item={item} type={item._searchType} view={view} />)}</div>}
        {isLoading && page > 1 && <p className="mt-5 text-center" role="status">{t('search.loading')}</p>}
        {hasMore && !isLoading && <div className="mt-8 text-center"><button type="button" onClick={() => setPage((current) => current + 1)} className="btn btn-primary btn-lg">{t('search.loadMore')}</button></div>}
      </div>
    </div>
  );
};
export default SearchItems;
