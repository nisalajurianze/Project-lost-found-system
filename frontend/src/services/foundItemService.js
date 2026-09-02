// ============================================
// Found Item Service
// API client calls for Found Items
// ============================================

import api from './api';
import { requireItemId } from '../utils/itemId';

const cleanParams = (params = {}) => {
  const cleaned = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleaned[key] = val;
    }
  }
  return cleaned;
};

const foundItemService = {
  /**
   * Create a new found item listing (supports image upload).
   * @param {FormData} formData
   */
  createFoundItem: async (formData, onUploadProgress) => {
    const res = await api.post('/found-items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
    return res.data.data;
  },

  /**
   * Get found items with optional filters.
   */
  getFoundItems: async (params = {}) => {
    const res = await api.get('/found-items', { params: cleanParams(params) });
    return res.data.data; // { items, pagination }
  },

  /**
   * Get found item details.
   */
  getFoundItemById: async (id) => {
    const targetId = requireItemId(id);
    const res = await api.get(`/found-items/${targetId}`);
    return res.data.data;
  },

  /**
   * Update a found item (supports multipart form).
   */
  updateFoundItem: async (id, formData, onUploadProgress) => {
    const targetId = requireItemId(id);
    const res = await api.put(`/found-items/${targetId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
    return res.data.data;
  },

  /**
   * Soft delete a found item.
   */
  deleteFoundItem: async (id) => {
    const targetId = requireItemId(id);
    const res = await api.delete(`/found-items/${targetId}`);
    return res.data;
  },

  connectFoundItem: async (id) => {
    const targetId = requireItemId(id);
    const res = await api.post(`/found-items/${targetId}/connect`);
    return res.data.data;
  },

  cancelConnection: async (id, reason) => {
    const targetId = requireItemId(id);
    const res = await api.post(`/found-items/${targetId}/cancel-connection`, { reason });
    return res.data.data;
  },

  resolveFoundItem: async (id) => {
    const targetId = requireItemId(id);
    const res = await api.post(`/found-items/${targetId}/resolve`);
    return res.data.data;
  }
};

export default foundItemService;
