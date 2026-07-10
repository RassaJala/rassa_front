import * as SecureStore from 'expo-secure-store';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import axiosRetry from 'axios-retry';

function resolveBaseURL(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
  const trimmed = configured.replace(/\/$/, '');

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
});

// Attach JWT token to every request
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios config is mutable internally
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

async function handleTokenRefresh(
  originalRequest: InternalAxiosRequestConfig,
): Promise<unknown> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const res = await axios.post<{ access: string; refresh: string }>(
    `${baseURL}/token/refresh/`,
    { refresh: refreshToken },
  );

  const { access, refresh } = res.data;
  await Promise.all([
    SecureStore.setItemAsync('access_token', access),
    SecureStore.setItemAsync('refresh_token', refresh),
  ]);

  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${access}`;
  }
  return api(originalRequest);
}

// Handle 401 and clear tokens when the request is unauthorized.
api.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios response is mutable internally
  (response) => response,
  async (error: unknown) => {
    if (error instanceof Error && (error as AxiosError).isAxiosError) {
      const axiosErr = error as AxiosError;
      const originalRequest = axiosErr.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (axiosErr.response?.status === 401) {
        if (
          originalRequest &&
          !originalRequest._retry &&
          originalRequest.url !== '/token/'
        ) {
          originalRequest._retry = true;
          try {
            return await handleTokenRefresh(originalRequest);
          } catch {
            await Promise.all([
              SecureStore.deleteItemAsync('access_token'),
              SecureStore.deleteItemAsync('refresh_token'),
            ]);
          }
        } else {
          await Promise.all([
            SecureStore.deleteItemAsync('access_token'),
            SecureStore.deleteItemAsync('refresh_token'),
          ]);
        }
      }
    }
    throw error;
  },
);

export default api;
