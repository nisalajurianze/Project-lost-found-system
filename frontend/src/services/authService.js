// ============================================
// Auth Service
// Communication with auth backend endpoints
// ============================================

import api from './api';
import { LOCAL_STORAGE_USER_KEY } from '../utils/constants';

const authService = {
  /**
   * Register a user.
   */
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },

  /**
   * Login user and save user object in localStorage.
   */
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    const { user, accessToken, refreshToken } = res.data.data;
    
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    return { user };
  },

  /**
   * Google Login/Signup.
   */
  googleLogin: async (idToken) => {
    const res = await api.post('/auth/google', { idToken });
    const { user, accessToken, refreshToken } = res.data.data;
    
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    return { user };
  },

  /**
   * Verify email via token.
   */
  verifyEmail: async (token) => {
    const res = await api.get(`/auth/verify-email?token=${token}`);
    return res.data;
  },

  /**
   * Get current logged-in user profile.
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  /**
   * Request password reset token.
   */
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Reset password with token.
   */
  resetPassword: async (token, password) => {
    const res = await api.post(`/auth/reset-password?token=${token}`, { password });
    return res.data;
  },

  /**
   * Logout user.
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed:', e);
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

export default authService;
