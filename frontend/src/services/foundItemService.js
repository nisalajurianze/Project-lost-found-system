// ============================================
// Found Item Service
// API client calls for Found Items
// ============================================

import api from './api';

const foundItemService = {
  /**
   * Create a new found item listing (supports image upload).
   * @param {FormData} formData
   */
  createFoundItem: async (formData) => {
    const res = await api.post('/found-items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Get found items with optional filters.
   */
  getFoundItems: async (params = {}) => {
    const res = await api.get('/found-items', { params });
    return res.data.data; // { items, pagination }
  },

  /**
   * Get found item details.
   */
  getFoundItemById: async (id) => {
    const res = await api.get(`/found-items/${id}`);
    return res.data.data;
  },

  /**
   * Update a found item (supports multipart form).
   */
  updateFoundItem: async (id, formData) => {
    const res = await api.put(`/found-items/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Soft delete a found item.
   */
  deleteFoundItem: async (id) => {
    const res = await api.delete(`/found-items/${id}`);
    return res.data;
  }
};

export default foundItemService;
