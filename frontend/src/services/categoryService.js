// ============================================
// Category Service
// API client calls for category settings
// ============================================

import api from './api';

const categoryService = {
  /**
   * Get active categories.
   */
  getCategories: async () => {
    const res = await api.get('/categories');
    return res.data.data;
  },

  /**
   * Create category (Admin only).
   */
  createCategory: async (data) => {
    const res = await api.post('/categories', data);
    return res.data.data;
  },

  /**
   * Update category (Admin only).
   */
  updateCategory: async (id, data) => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data.data;
  },

  /**
   * Delete category (Admin only).
   */
  deleteCategory: async (id) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  }
};

export default categoryService;
