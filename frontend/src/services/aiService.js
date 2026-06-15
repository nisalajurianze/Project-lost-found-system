import api from './api';

const aiService = {
  suggestDetailsFromImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/ai/suggest-details', formData);
    return response.data;
  },
};

export default aiService;
