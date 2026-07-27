import axios from 'axios';
import { API_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const rawClient = axios.create({ baseURL: API_URL, withCredentials: true });
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

const readCookie = (name) => document.cookie
  .split('; ')
  .find((entry) => entry.startsWith(`${name}=`))
  ?.split('=')
  .slice(1)
  .join('=');

let csrfPromise;
export const ensureCsrfToken = async () => {
  const existing = readCookie('csrfToken');
  if (existing) return decodeURIComponent(existing);
  if (!csrfPromise) {
    csrfPromise = rawClient.get('/auth/csrf').then((response) => response.data?.data?.csrfToken).finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
};

client.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase();
  if (unsafeMethods.has(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

let refreshPromise;
const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrfToken = await ensureCsrfToken();
      return rawClient.post('/auth/refresh-token', {}, { headers: { 'X-CSRF-Token': csrfToken } });
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = String(originalRequest.url || '');
    if (error.response?.status === 401 && !originalRequest._retry && !requestUrl.includes('/auth/refresh-token') && !requestUrl.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return client(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject({ message: refreshError.response?.data?.message || 'Your session has expired.', statusCode: 401, errors: [] });
      }
    }
    return Promise.reject({
      message: error.response?.data?.message || error.message || 'Something went wrong. Please try again.',
      errors: error.response?.data?.errors || [],
      statusCode: error.response?.status || 500,
      response: error.response,
    });
  }
);

export default client;
