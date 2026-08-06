import { Platform } from 'react-native';

import * as Sentry from '@sentry/react-native';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import axiosRetry from 'axios-retry';

import { API_RETRY_LIMIT } from '@/common/networking';

import { sanitizeSentryError } from './sentry';
import * as Storage from './storage';

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV?: string;
  };
};

// ── Constants ─────────────────────────────────────────────
const API_TIMEOUT_MS = 15_000;
const SERVER_ERROR_THRESHOLD = 500;
const REFRESH_TIMEOUT_MS = 8_000;

// Endpoints where we never attempt token refresh (login, refresh themselves)
const AUTH_ENDPOINTS = ['/token/', '/token/refresh/'];

function resolveBaseURL(): string {
  // On web, always use localhost (browser runs on the same machine as the server).
  // On native, respect EXPO_PUBLIC_API_URL so physical devices can reach the backend.

  const envUrl: string | undefined = process.env.EXPO_PUBLIC_API_URL;
  const configured =
    Platform.OS === 'web'
      ? 'http://localhost:8000'
      : (envUrl ?? 'http://localhost:8000');
  const trimmed = configured.replace(/\/$/, '');

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveBaseURL();

function isPrivateHost(rawUrl: string): boolean {
  const withoutScheme = rawUrl.replace(/^https?:\/\//i, '');
  const host = withoutScheme.split(/[/:]/)[0]?.toLowerCase();

  if (!host) return false;

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

// Guard: reject HTTP in production to prevent credential leakage,
// but allow private/LAN hosts so physical devices can reach a local backend.
if (
  baseURL.startsWith('http://') &&
  process.env.NODE_ENV === 'production' &&
  !isPrivateHost(baseURL)
) {
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
  retries: API_RETRY_LIMIT,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined &&
        error.response.status >= SERVER_ERROR_THRESHOLD)
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
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Token read from storage failed',
      data: { key: Storage.ACCESS_TOKEN_KEY },
      level: 'warning',
    });
  }

  return config;
});

// ── Auth expiry callback ──────────────────────────────────
// Registered by AuthContext so the interceptor can force-logout the user.
let onAuthExpired: (() => void) | null = null;

export function registerAuthExpiredCallback(cb: () => void): void {
  onAuthExpired = cb;
}

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    try {
      const res = await api.post<{ access: string; refresh: string }>(
        '/token/refresh/',
        { refresh: refreshToken },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);
      const { access, refresh } = res.data;
      await Promise.all([
        Storage.setItemAsync(Storage.ACCESS_TOKEN_KEY, access),
        Storage.setItemAsync(Storage.REFRESH_TOKEN_KEY, refresh),
      ]);
      return access;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  })();

  return refreshPromise;
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

    // Auth endpoints themselves (login, refresh) — clear tokens, notify, no retry
    if (AUTH_ENDPOINTS.includes(originalRequest.url ?? '')) {
      await Promise.all([
        Storage.deleteItemAsync(Storage.ACCESS_TOKEN_KEY),
        Storage.deleteItemAsync(Storage.REFRESH_TOKEN_KEY),
      ]);
      onAuthExpired?.();
      throw error;
    }

    originalRequest._retry = true;

    let newAccessToken: string | undefined;

    try {
      newAccessToken = await refreshTokens();
    } catch (refreshError) {
      refreshPromise = null;
      Sentry.captureException(sanitizeSentryError(refreshError));
      await Promise.all([
        Storage.deleteItemAsync(Storage.ACCESS_TOKEN_KEY),
        Storage.deleteItemAsync(Storage.REFRESH_TOKEN_KEY),
      ]);
      onAuthExpired?.();
      throw error;
    }

    // Refresh succeeded — retry original request with fresh token
    if (originalRequest.headers && newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    }
    try {
      return await api(originalRequest);
    } finally {
      refreshPromise = null;
    }
  },
);

export default api;

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = baseURL.replace(/\/api\/?$/, '');
  const decoded = decodeURIComponent(path);
  const clean = decoded.replace(/\.\./g, '').replace(/^\/+/, '/');
  const prefixed = clean.startsWith('/') ? clean : `/${clean}`;
  try {
    return `${base}${encodeURI(prefixed)}`;
  } catch {
    return null;
  }
}

/**
 * Indica si una URL puede seguirse de forma segura con las credenciales del
 * cliente: solo rutas relativas o absolutas del mismo origen que la API.
 */
export function isApiUrl(url: string): boolean {
  if (url.startsWith('//')) return false;
  if (url.startsWith('/')) return true;
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}
