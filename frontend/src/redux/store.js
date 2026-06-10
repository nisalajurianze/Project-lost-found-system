// ============================================
// Redux Store Configuration
// Integrates all slices into a single state tree
// ============================================

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import lostItemReducer from './slices/lostItemSlice';
import foundItemReducer from './slices/foundItemSlice';
import matchReducer from './slices/matchSlice';
import claimReducer from './slices/claimSlice';
import notificationReducer from './slices/notificationSlice';
import categoryReducer from './slices/categorySlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    lostItems: lostItemReducer,
    foundItems: foundItemReducer,
    matches: matchReducer,
    claims: claimReducer,
    notifications: notificationReducer,
    categories: categoryReducer,
    admin: adminReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Disable serializability check for FormData objects in action payloads
    })
});

export default store;
