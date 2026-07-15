import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import axiosRetry from 'axios-retry';

import * as Storage from './storage';

// ── Constants ─────────────────────────────────────────────
const API_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const SERVER_ERROR_THRESHOLD = 500;
const REFRESH_TIMEOUT_MS = 8_000;

// Endpoints where we never attempt token refresh (login, refresh themselves)
const AUTH_ENDPOINTS = ['/token/', '/token/refresh/'];

function resolveBaseURL(): string {
  // eslint-disable-next-line no-undef -- process is injected by expo
  const configured: string = String(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000');
  const trimmed = configured.replace(/\/$/, '');

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveBaseURL();

// Guard: reject HTTP in production to prevent credential leakage
// eslint-disable-next-line no-undef -- process is injected by expo
if (baseURL.startsWith('http://') && process.env.NODE_ENV === 'production') {
  throw new Error(
    'EXPO_PUBLIC_API_URL must use HTTPS in production. ' +
      'Unencrypted HTTP exposes authentication tokens to network interception.',
  );
}

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

// Attach JWT token to every request
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios config is mutable internally
api.interceptors.request.use(async (config) => {
  try {
    const token = await Storage.getItemAsync(Storage.ACCESS_TOKEN_KEY);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Token read failure is non-fatal; server returns 401 if auth is needed
  }

  return config;
});

// ── Token refresh single-flight ───────────────────────────
// Ensures concurrent 401s coalesce into a single refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  if (refreshPromise) {
    // Another 401 is already refreshing — wait for it and use its result
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await Storage.getItemAsync(Storage.REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token available');

    const res = await Promise.race([
      api.post<{ access: string; refresh: string }>('/token/refresh/', {
        refresh: refreshToken,
      }),
      new Promise<never>((_resolve, reject) =>
        // eslint-disable-next-line no-undef -- global in RN/Node
        setTimeout(
          () => reject(new Error('Refresh token request timed out')),
          REFRESH_TIMEOUT_MS,
        ),
      ),
    ]);

    const { access, refresh } = res.data;
    await Promise.all([
      Storage.setItemAsync(Storage.ACCESS_TOKEN_KEY, access),
      Storage.setItemAsync(Storage.REFRESH_TOKEN_KEY, refresh),
    ]);
    return access;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Interceptor that retries 401 responses with a fresh token.
 *
 * Flow:
 *  1. Non-401 or already-retried errors pass through immediately.
 *  2. 401 on an auth endpoint (/token/, /token/refresh/) clears tokens
 *     and rejects — no refresh attempt.
 *  3. Otherwise, coalesces into a single refresh. If refresh fails, clears
 *     tokens and rejects. If refresh succeeds, retries the original request
 *     with the new token. Failures from the retried request propagate
 *     naturally — they do NOT clear tokens (B10 fix).
 */
api.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios response is mutable internally
  (response) => response,
  async (error: unknown) => {
    // Only handle Axios errors
    if (!axios.isAxiosError(error)) throw error;

    const axiosErr = error as AxiosError;
    const originalRequest = axiosErr.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Non-401, already retried, or missing config — pass through
    if (
      axiosErr.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      throw error;
    }

    // Auth endpoints themselves (login, refresh) — clear tokens, no retry
    if (AUTH_ENDPOINTS.includes(originalRequest.url ?? '')) {
      await Promise.all([
        Storage.deleteItemAsync(Storage.ACCESS_TOKEN_KEY),
        Storage.deleteItemAsync(Storage.REFRESH_TOKEN_KEY),
      ]);
      throw error;
    }

    originalRequest._retry = true;

    let newAccessToken: string | undefined;

    try {
      newAccessToken = await refreshTokens();
    } catch {
      // Refresh itself failed — clear tokens and reject
      await Promise.all([
        Storage.deleteItemAsync(Storage.ACCESS_TOKEN_KEY),
        Storage.deleteItemAsync(Storage.REFRESH_TOKEN_KEY),
      ]);
      throw error;
    }

    // Refresh succeeded — retry original request with fresh token
    if (originalRequest.headers && newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    }
    return api(originalRequest);
  },
);

export default api;
