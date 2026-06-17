import api from './api';

const settingService = {
  /**
   * Fetch a public setting by key
   * @param {string} key - Setting key (e.g., 'contact_details')
   * @returns {Promise<Object>} The setting value
   */
  getPublicSetting: async (key) => {
    const response = await api.get(`/settings/public/${key}`);
    return response.data;
  },

  /**
   * Update a setting by key (Admin only)
   * @param {string} key - Setting key
   * @param {any} value - The new setting value
   * @param {string} description - Optional description
   * @returns {Promise<Object>} The updated setting
   */
  updateSetting: async (key, value, description = '') => {
    const response = await api.put(`/settings/${key}`, { value, description });
    return response.data;
  }
};

export default settingService;
