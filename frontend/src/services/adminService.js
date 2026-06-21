// ============================================
// Admin Service
// Admin-only dashboard statistics and management calls
// ============================================

import api from './api';

const adminService = {
  /**
   * Get compiler dashboard stats.
   */
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data.data;
  },

  /**
   * Get list of users (Admin only).
   */
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params });
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
    const res = await api.get('/admin/logs', { params });
    return res.data.data; // { logs, pagination }
  },

  /**
   * Hard delete user account.
   */
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data.data;
  }
};

export default adminService;
// 
