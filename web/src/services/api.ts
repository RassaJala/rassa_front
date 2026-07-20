import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

if (typeof window !== 'undefined' && window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
  console.warn('[rassa] Running on HTTP outside localhost — tokens may be intercepted');
}

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      error.config?.method === 'get' &&
      axiosRetry.isNetworkOrIdempotentRequestError(error)
    );
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname !== '/login'
    ) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
