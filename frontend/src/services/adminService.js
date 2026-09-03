// ============================================
// Admin Service
// Admin-only dashboard statistics and management calls
// ============================================

import api from './api';

const cleanParams = (params = {}) => {
  const cleaned = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleaned[key] = val;
    }
  }
  return cleaned;
};

const adminService = {
  /**
   * Get compiler dashboard stats.
   */
  getAIHealth: async () => {
    const res = await api.get('/admin/ai-health');
    return res.data.data;
  },

  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data.data;
  },

  explainAnalytics: async (question) => {
    const res = await api.post('/admin/analytics/explain', { question });
    return res.data.data;
  },

  getDuplicateReviews: async (params = {}) => {
    const res = await api.get('/admin/duplicate-reviews', { params: cleanParams(params) });
    return res.data.data;
  },

  reviewDuplicate: async (id, status, reviewNote = '') => {
    const res = await api.put(`/admin/duplicate-reviews/${id}`, { status, reviewNote });
    return res.data.data;
  },

  getAssistantHandoffs: async (params = {}) => {
    const res = await api.get('/admin/assistant-handoffs', { params: cleanParams(params) });
    return res.data.data;
  },

  reviewAssistantHandoff: async (id, status, adminNote = '') => {
    const res = await api.put(`/admin/assistant-handoffs/${id}`, { status, adminNote });
    return res.data.data;
  },

  /**
   * Get list of users (Admin only).
   */
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params: cleanParams(params) });
    return res.data.data; // { users, pagination }
  },

  /**
   * Toggle user account activation status.
   */
  updateUserStatus: async (id, isActive) => {
    const res = await api.put(`/admin/users/${id}/status`, { isActive });
    return res.data.data;
  },

  /**
   * Toggle user role (Promote/Demote).
   */
  updateUserRole: async (id, role) => {
    const res = await api.put(`/admin/users/${id}/role`, { role });
    return res.data.data;
  },

  /**
   * Get admin audit logs.
   */
  getAdminLogs: async (params = {}) => {
    const res = await api.get('/admin/logs', { params: cleanParams(params) });
    return res.data.data; // { logs, pagination }
  },

  /**
   * Privacy-safe account anonymisation and closure.
   */
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data.data;
  }
};

export default adminService;
//
