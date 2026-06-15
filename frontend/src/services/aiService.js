import api from './api';

const aiService = {
  suggestDetailsFromImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/ai/suggest-details', formData, {
      transformRequest: [(data, headers) => {
        delete headers.common['Content-Type'];
        delete headers.post['Content-Type'];
        delete headers['Content-Type'];
        return data;
      }],
    });
    return response.data;
  },
};

export default aiService;
