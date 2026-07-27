import api from './api';

const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return { ...response.data.data, message: response.data.message };
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return { user: response.data.data.user };
  },
  googleLogin: async (idToken) => {
    const response = await api.post('/auth/google', { idToken });
    return { user: response.data.data.user };
  },
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
  updateProfile: async (profileData) => {
    const config = profileData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await api.put('/users/profile', profileData, config);
    return response.data.data;
  },
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password, confirmPassword: password });
    return response.data;
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* local state is still cleared */ }
  },
};

export default authService;
