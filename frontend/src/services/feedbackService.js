// ============================================
// Feedback Service
// API calls for user feedback and ratings
// ============================================

import api from './api';

const feedbackService = {
  /**
   * Submit new feedback.
   * @param {Object} feedbackData - { subject, message, rating, category }
   * @returns {Promise<Object>} API Response
   */
  createFeedback: async (feedbackData) => {
    const res = await api.post('/feedback', feedbackData);
    return res.data;
  },

  /**
   * Get feedback (Admin only).
   * @param {Object} params - { category, rating, status, page, limit }
   * @returns {Promise<Object>} API Response
   */
  getFeedbacks: async (params = {}) => {
    const res = await api.get('/feedback', { params });
    return res.data.data;
  },

  /**
   * Respond to feedback (Admin only).
   * @param {string} id - Feedback ID
   * @param {Object} responseData - { adminResponse, status }
   * @returns {Promise<Object>} API Response
   */
  respondToFeedback: async (id, responseData) => {
    const res = await api.put(`/feedback/${id}/respond`, responseData);
    return res.data;
  }
};

export default feedbackService;
