const SAVED_SEARCHES_KEY = 'lf-saved-searches-v1';
const MAX_SAVED_SEARCHES = 5;
const SAVED_SEARCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const allowedTypes = new Set(['both', 'lost', 'found']);
const allowedSorts = new Set(['-createdAt', 'createdAt', 'itemName']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const safeText = (value, max = 120) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const safeDate = (value) => datePattern.test(String(value || '')) ? String(value) : '';
const normalizePrincipalId = (principalId) => String(principalId || 'guest').trim() || 'guest';
const getSavedSearchesKey = (principalId) => `${SAVED_SEARCHES_KEY}:${encodeURIComponent(normalizePrincipalId(principalId))}`;

const sanitizeSearchFilters = (filters = {}) => ({
  query: safeText(filters.query, 200),
  type: allowedTypes.has(filters.type) ? filters.type : 'both',
  category: safeText(filters.category, 80),
  startDate: safeDate(filters.startDate),
  endDate: safeDate(filters.endDate),
  sort: allowedSorts.has(filters.sort) ? filters.sort : '-createdAt',
});

const searchTitle = (filters) => {
  if (filters.query) return filters.query.slice(0, 56);
  if (filters.category) return `${filters.category} · ${filters.type}`;
  if (filters.type !== 'both') return `${filters.type} reports`;
  return 'All recent reports';
};

const createSavedSearch = ({ id, filters, now = Date.now() } = {}) => {
  const sanitized = sanitizeSearchFilters(filters);
  return {
    id: id || `search-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: searchTitle(sanitized),
    filters: sanitized,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
};

const normalizeSavedSearches = (value, now = Date.now()) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry.id === 'string')
    .map((entry) => ({
      ...createSavedSearch({ id: entry.id, filters: entry.filters, now: Date.parse(entry.updatedAt) || now }),
      createdAt: entry.createdAt || entry.updatedAt || new Date(now).toISOString(),
    }))
    .filter((entry) => now - Date.parse(entry.updatedAt) <= SAVED_SEARCH_TTL_MS)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_SAVED_SEARCHES);
};

const loadSavedSearches = ({ principalId = 'guest', storage = globalThis.localStorage, now = Date.now() } = {}) => {
  if (!storage?.getItem) return [];
  const key = getSavedSearchesKey(principalId);
  storage.removeItem?.(SAVED_SEARCHES_KEY);
  try {
    const normalized = normalizeSavedSearches(JSON.parse(storage.getItem(key) || '[]'), now);
    storage.setItem?.(key, JSON.stringify(normalized));
    return normalized;
  } catch {
    storage.removeItem?.(key);
    return [];
  }
};

const saveSearch = (filters, options = {}) => {
  const { principalId = 'guest', storage = globalThis.localStorage, now = Date.now() } = options;
  const key = getSavedSearchesKey(principalId);
  const current = loadSavedSearches({ principalId, storage, now });
  const sanitized = sanitizeSearchFilters(filters);
  const signature = JSON.stringify(sanitized);
  const existing = current.find((entry) => JSON.stringify(entry.filters) === signature);
  const saved = createSavedSearch({ id: existing?.id, filters: sanitized, now });
  if (existing?.createdAt) saved.createdAt = existing.createdAt;
  const next = normalizeSavedSearches([saved, ...current.filter((entry) => entry.id !== saved.id)], now);
  storage?.setItem?.(key, JSON.stringify(next));
  return next;
};

const deleteSavedSearch = (id, options = {}) => {
  const { principalId = 'guest', storage = globalThis.localStorage, now = Date.now() } = options;
  const key = getSavedSearchesKey(principalId);
  const next = loadSavedSearches({ principalId, storage, now }).filter((entry) => entry.id !== id);
  storage?.setItem?.(key, JSON.stringify(next));
  return next;
};

const clearSavedSearches = ({ principalId = 'guest', storage = globalThis.localStorage } = {}) => {
  storage?.removeItem?.(getSavedSearchesKey(principalId));
  storage?.removeItem?.(SAVED_SEARCHES_KEY);
};

export {
  SAVED_SEARCHES_KEY,
  MAX_SAVED_SEARCHES,
  SAVED_SEARCH_TTL_MS,
  getSavedSearchesKey,
  sanitizeSearchFilters,
  createSavedSearch,
  loadSavedSearches,
  saveSearch,
  deleteSavedSearch,
  clearSavedSearches,
};
