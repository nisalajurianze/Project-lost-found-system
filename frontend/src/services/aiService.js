import api from './api';

const aiService = {
  suggestDetailsFromImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/ai/suggest-details', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  resolveLocation: async (query) => {
    const response = await api.post('/ai/location/resolve', { query });
    return response.data.data;
  },

  assessReportDraft: async (payload) => {
    const response = await api.post('/ai/report/assess', payload);
    return response.data.data;
  },

  autoCreateCategory: async (name) => {
    const response = await api.post('/categories/auto-create', { name });
    return response.data;
  }
};

export default aiService;
