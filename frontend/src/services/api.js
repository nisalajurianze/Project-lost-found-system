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
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request Interceptor (Can be used for other headers if needed)
api.interceptors.request.use(
  (config) => {
    // The accessToken is handled automatically via HTTP-only cookies
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
      if (
        originalRequest.url === '/auth/refresh-token' || 
        originalRequest.url === '/auth/login' ||
        originalRequest.url === '/auth/logout'
      ) {
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
        await axios.get(`${API_URL}/auth/refresh-token`, {
          withCredentials: true
        });

        // The backend sets the new accessToken in an HTTP-only cookie automatically.
        processQueue(null, null);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        console.warn('💀 Session expired. Logging user out.');
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear local storage and dispatch a custom event to redirect to login
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
