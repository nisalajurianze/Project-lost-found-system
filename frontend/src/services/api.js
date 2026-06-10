// ============================================
// Axios API Client
// Handles request/response intercepts and session refreshing
// ============================================

import axios from 'axios';
import { API_URL, LOCAL_STORAGE_TOKEN_KEY } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with all requests (refresh token)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach bearer accessToken to header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Auto-refresh tokens on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid infinite loop of refresh attempts
      if (originalRequest.url === '/auth/refresh-token' || originalRequest.url === '/auth/login') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Access token expired. Attempting token refresh...');
        const refreshResponse = await axios.get(`${API_URL}/auth/refresh-token`, {
          withCredentials: true
        });

        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, accessToken);

        // Update default header and original request header
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        console.warn('💀 Session expired. Logging user out.');
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear local storage and dispatch a custom event to redirect to login
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem('smart-lf-user');
        window.dispatchEvent(new Event('auth-logout'));

        return Promise.reject(refreshError);
      }
    }

    // Normalized error format for catch blocks
    const normalizedError = {
      message: error.response?.data?.message || 'Something went wrong. Please try again.',
      errors: error.response?.data?.errors || [],
      statusCode: error.response?.status || 500
    };

    return Promise.reject(normalizedError);
  }
);

export default api;
