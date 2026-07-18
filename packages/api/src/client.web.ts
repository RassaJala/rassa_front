// packages/api/src/client.web.ts

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// ── Constants ─────────────────────────────────────────────
const API_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const SERVER_ERROR_THRESHOLD = 500;

function resolveBaseURL(): string {
  // Web environment - always use localhost as per original pattern
  const baseURL = 'http://localhost:8000/api';
  const trimmed = baseURL.replace(/\/$/, '');
  return trimmed;
}

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosRetry(api, {
  retries: MAX_RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      (axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined &&
          error.response.status >= SERVER_ERROR_THRESHOLD)) &&
      error.config?.method !== 'post'
    );
  },
});

// Attach JWT token to every request (web version - no storage, but maintains interface)
api.interceptors.request.use((config) => {
  // Web version - no token storage for now
  // JWT would be in cookies or localStorage in web implementations
  return config;
});

export default api;