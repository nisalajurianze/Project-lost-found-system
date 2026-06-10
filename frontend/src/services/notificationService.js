// ============================================
// Notification Service
// API client calls for in-app notifications
// ============================================

import api from './api';

const notificationService = {
  /**
   * Get all notifications for user.
   */
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data.data; // { notifications, pagination }
  },

  /**
   * Mark notification as read.
   */
  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data.data;
  },

  /**
   * Mark all notifications as read.
   */
  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },

  /**
   * Delete a notification.
   */
  deleteNotification: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  }
};

export default notificationService;
