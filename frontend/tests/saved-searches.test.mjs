import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_SAVED_SEARCHES,
  SAVED_SEARCH_TTL_MS,
  getSavedSearchesKey,
  loadSavedSearches,
  sanitizeSearchFilters,
  saveSearch,
} from '../src/utils/savedSearches.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('saved search filters are bounded and invalid URL values fall back safely', () => {
  assert.deepEqual(sanitizeSearchFilters({ query: '  black   phone ', type: 'unsafe', sort: 'drop-table', startDate: 'tomorrow' }), {
    query: 'black phone', type: 'both', category: '', startDate: '', endDate: '', sort: '-createdAt',
  });
});

test('saved searches deduplicate, expire and retain at most five browser-local entries', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 6, 26);
  const options = { principalId: 'user-a', storage, now };
  let saved = [];
  for (let index = 0; index < 7; index += 1) saved = saveSearch({ query: `query ${index}`, type: 'both' }, { ...options, now: now + index });
  assert.equal(saved.length, MAX_SAVED_SEARCHES);
  saved = saveSearch({ query: 'query 6', type: 'both' }, { ...options, now: now + 100 });
  assert.equal(saved.length, MAX_SAVED_SEARCHES);
  const key = getSavedSearchesKey('user-a');
  const raw = JSON.parse(storage.getItem(key));
  raw.push({ id: 'expired', filters: { query: 'old' }, updatedAt: new Date(now - SAVED_SEARCH_TTL_MS - 1).toISOString() });
  storage.setItem(key, JSON.stringify(raw));
  assert.equal(loadSavedSearches({ ...options, now: now + 200 }).some((entry) => entry.id === 'expired'), false);
});

test('saved searches are principal-scoped and unsafe legacy data is discarded', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 6, 26);
  storage.setItem('lf-saved-searches-v1', JSON.stringify([{ id: 'legacy', filters: { query: 'private' } }]));
  saveSearch({ query: 'user a' }, { principalId: 'user-a', storage, now });
  assert.equal(loadSavedSearches({ principalId: 'user-b', storage, now }).length, 0);
  assert.equal(loadSavedSearches({ principalId: 'user-a', storage, now })[0].filters.query, 'user a');
  assert.equal(storage.getItem('lf-saved-searches-v1'), null);
});

test('search page synchronises URL state and exposes rerun/delete saved-search controls', () => {
  const source = fs.readFileSync(new URL('../src/pages/public/SearchItems.jsx', import.meta.url), 'utf8');
  assert.match(source, /useSearchParams/);
  assert.match(source, /setSearchParams\(next, \{ replace: true \}\)/);
  assert.match(source, /applySavedSearch/);
  assert.match(source, /removeSavedSearch/);
  assert.match(source, /savedSearches\.map/);
  assert.match(source, /loadSavedSearches\(\{ principalId \}\)/);
});
