// ============================================
// Frontend Constants
// API routes, item status keys, and defaults
// ============================================

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const LOCAL_STORAGE_THEME_KEY = 'smart-lf-theme';
export const LOCAL_STORAGE_TOKEN_KEY = 'smart-lf-token';
export const LOCAL_STORAGE_USER_KEY = 'smart-lf-user';

export const ITEM_STATUSES = {
  lost: {
    PENDING: 'pending',
    MATCHED: 'matched',
    CLAIMED: 'claimed',
    CLOSED: 'closed'
  },
  found: {
    AVAILABLE: 'available',
    MATCHED: 'matched',
    CLAIMED: 'claimed'
  }
};

export const CONTACT_PREFERENCES = {
  EMAIL: 'email',
  PHONE: 'phone',
  BOTH: 'both'
};

export const FEEDBACK_CATEGORIES = {
  GENERAL: 'general',
  BUG_REPORT: 'bug_report',
  FEATURE_REQUEST: 'feature_request',
  COMPLAINT: 'complaint',
  PRAISE: 'praise'
};

export const NOTIFICATION_TYPES = {
  MATCH_FOUND: 'match_found',
  CLAIM_SUBMITTED: 'claim_submitted',
  CLAIM_APPROVED: 'claim_approved',
  CLAIM_REJECTED: 'claim_rejected',
  ITEM_UPDATE: 'item_update',
  SYSTEM: 'system',
  WELCOME: 'welcome'
};
