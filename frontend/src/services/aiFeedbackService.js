import api from './api';

const aiFeedbackService = {
  submit: async (payload) => (await api.post('/ai-feedback', payload)).data.data,
  list: async (params = {}) => (await api.get('/ai-feedback', { params })).data.data,
  review: async (id, payload) => (await api.put(`/ai-feedback/${id}/review`, payload)).data.data,
};
export default aiFeedbackService;
