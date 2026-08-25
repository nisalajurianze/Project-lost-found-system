// ============================================
// Redux Store Configuration
// Integrates all slices into a single state tree
// ============================================

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import lostItemReducer from './slices/lostItemSlice';
import foundItemReducer from './slices/foundItemSlice';
import matchReducer from './slices/matchSlice';
import claimReducer from './slices/claimSlice';
import notificationReducer from './slices/notificationSlice';
import categoryReducer from './slices/categorySlice';
import adminReducer from './slices/adminSlice';
import { clearSavedSearches } from '../utils/savedSearches';
import { clearAssistantConversations } from '../utils/assistantHistory';
import { clearAssistantReportDraft } from '../utils/assistantReportDraft';
import { createAccountRequestFenceMiddleware, getPrincipalId } from './accountBoundary';

const appReducer = combineReducers({
  theme: themeReducer,
  auth: authReducer,
  lostItems: lostItemReducer,
  foundItems: foundItemReducer,
  matches: matchReducer,
  claims: claimReducer,
  notifications: notificationReducer,
  categories: categoryReducer,
  admin: adminReducer,
});

export const rootReducer = (state, action) => {
  const principalBefore = getPrincipalId(state?.auth);
  const principalAfter = getPrincipalId(authReducer(state?.auth, action));
  const crossesAccountBoundary = principalBefore !== principalAfter;
  const startsLogout = action?.type === 'auth/logout/pending' || action?.type === 'auth/clearAuth';

  const nextState = state && (crossesAccountBoundary || startsLogout)
    ? { theme: state.theme, categories: state.categories, auth: state.auth }
    : state;
  return appReducer(nextState, action);
};

const clearPrincipalClientData = (principalId) => {
  const scopedPrincipalId = principalId || 'guest';
  clearSavedSearches({ principalId: scopedPrincipalId });
  clearAssistantConversations({ principalId: scopedPrincipalId });
  clearAssistantReportDraft({ principalId: scopedPrincipalId });
};

const accountRequestFenceMiddleware = createAccountRequestFenceMiddleware({
  onBoundaryChange: clearPrincipalClientData,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Disable serializability check for FormData objects in action payloads
    }).prepend(accountRequestFenceMiddleware)
});

export default store;
