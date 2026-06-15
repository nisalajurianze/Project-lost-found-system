import api from './api';

const aiService = {
  suggestDetailsFromImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/ai/suggest-details', formData, {
      headers: {
        'Content-Type': null,
      },
    });
    return response.data;
  },
};

export default aiService;
