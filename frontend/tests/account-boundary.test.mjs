import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAccountRequestFenceMiddleware } from '../src/redux/accountBoundary.js';

const createHarness = (principalId = 'user-a', onBoundaryChange = () => undefined) => {
  let state = { auth: { user: principalId ? { _id: principalId } : null } };
  const delivered = [];
  const middleware = createAccountRequestFenceMiddleware({ onBoundaryChange })({ getState: () => state });
  const dispatch = middleware((action) => {
    delivered.push(action.type);
    if (action.type === 'auth/login/fulfilled') state = { auth: { user: action.payload.user } };
    if (action.type === 'auth/clearAuth') state = { auth: { user: null } };
    return action;
  });
  return { dispatch, delivered, setPrincipal: (next) => { state = { auth: { user: next ? { _id: next } : null } }; } };
};

const asyncAction = (type, requestStatus, requestId, payload) => ({ type, payload, meta: { requestStatus, requestId } });

test('only the latest request for an account operation may update Redux', () => {
  const { dispatch, delivered } = createHarness();
  dispatch(asyncAction('claims/fetchClaims/pending', 'pending', 'old'));
  dispatch(asyncAction('claims/fetchClaims/pending', 'pending', 'new'));
  dispatch(asyncAction('claims/fetchClaims/fulfilled', 'fulfilled', 'old', ['stale']));
  dispatch(asyncAction('claims/fetchClaims/fulfilled', 'fulfilled', 'new', ['fresh']));
  assert.deepEqual(delivered, ['claims/fetchClaims/pending', 'claims/fetchClaims/pending', 'claims/fetchClaims/fulfilled']);
});

test('an account response is rejected after the active principal changes', () => {
  const { dispatch, delivered, setPrincipal } = createHarness('user-a');
  dispatch(asyncAction('notifications/fetchNotifications/pending', 'pending', 'request-a'));
  setPrincipal('user-b');
  dispatch(asyncAction('notifications/fetchNotifications/fulfilled', 'fulfilled', 'request-a', ['private-a']));
  assert.deepEqual(delivered, ['notifications/fetchNotifications/pending']);
});

test('identity restoration cannot overwrite a newer explicit login', () => {
  const { dispatch, delivered } = createHarness('');
  dispatch(asyncAction('auth/fetchCurrentUser/pending', 'pending', 'restore'));
  dispatch(asyncAction('auth/login/pending', 'pending', 'login'));
  dispatch(asyncAction('auth/fetchCurrentUser/fulfilled', 'fulfilled', 'restore', { _id: 'wrong' }));
  dispatch(asyncAction('auth/login/fulfilled', 'fulfilled', 'login', { user: { _id: 'user-a' } }));
  assert.deepEqual(delivered, ['auth/fetchCurrentUser/pending', 'auth/login/pending', 'auth/login/fulfilled']);
});

test('store resets account slices while preserving global theme and categories', () => {
  const source = fs.readFileSync(new URL('../src/redux/store.js', import.meta.url), 'utf8');
  assert.match(source, /crossesAccountBoundary \|\| startsLogout/);
  assert.match(source, /\{ theme: state\.theme, categories: state\.categories, auth: state\.auth \}/);
  assert.match(source, /prepend\(accountRequestFenceMiddleware\)/);
});
