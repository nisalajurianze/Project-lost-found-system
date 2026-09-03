import api from './api';

const aiFeedbackService = {
  submit: async (payload) => (await api.post('/ai-feedback', payload)).data.data,
  list: async (params = {}) => (await api.get('/ai-feedback', { params })).data.data,
  review: async (id, payload) => (await api.put(`/ai-feedback/${id}/review`, payload)).data.data,
  getCalibration: async () => (await api.get('/ai-feedback/calibration')).data.data,
  sealSnapshot: async (threshold = 70) => (await api.post('/ai-feedback/calibration/snapshots', { threshold })).data.data,
  createChallenger: async (payload) => (await api.post('/ai-feedback/calibration/experiments', payload)).data.data,
  promoteChallenger: async (id) => (await api.put(`/ai-feedback/calibration/experiments/${id}/promote`)).data.data,
};
export default aiFeedbackService;
