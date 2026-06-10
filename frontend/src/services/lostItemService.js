// ============================================
// Lost Item Service
// API client calls for Lost Items
// ============================================

import api from './api';

const lostItemService = {
  /**
   * Create a new lost item report (supports image upload).
   * @param {FormData} formData
   */
  createLostItem: async (formData) => {
    const res = await api.post('/lost-items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Get lost items with optional filters.
   * @param {object} params - search, category, status, page, limit, userId
   */
  getLostItems: async (params = {}) => {
    const res = await api.get('/lost-items', { params });
    return res.data.data; // { items, pagination }
  },

  /**
   * Get lost item details.
   */
  getLostItemById: async (id) => {
    const res = await api.get(`/lost-items/${id}`);
    return res.data.data;
  },

  /**
   * Update a lost item (supports multipart form for images).
   */
  updateLostItem: async (id, formData) => {
    const res = await api.put(`/lost-items/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Soft delete a lost item.
   */
  deleteLostItem: async (id) => {
    const res = await api.delete(`/lost-items/${id}`);
    return res.data;
  }
};

export default lostItemService;
// 
