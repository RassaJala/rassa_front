import axios from 'axios';
import axiosRetry from 'axios-retry';
import { redirect } from './navigate';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const PUBLIC_ENDPOINTS = ['/token/', '/auth/register/'];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((prefix) => url.startsWith(prefix));
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
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
  const url = config.url ?? '';
  if (isPublic(url)) return config;
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const NO_REDIRECT_ON_401 = [
  '/auth/change-password/',
  '/auth/me/',
  '/token/refresh/',
];

// --- Refresh token ---

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

async function refreshAccessToken(
  originalRequest: ReturnType<typeof api>['config'],
): Promise<unknown> {
  const refreshToken = sessionStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await api.post<{ access: string }>('/token/refresh/', {
    refresh: refreshToken,
  });

  localStorage.setItem('token', data.access);

  // Retry all queued requests with the new token
  pendingRequests.forEach(({ resolve }) => resolve(data.access));
  pendingRequests = [];

  originalRequest.headers.Authorization = `Bearer ${data.access}`;
  return api(originalRequest);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl: string | undefined = error.config?.url;
    const is401 =
      error.response?.status === 401 &&
      window.location.pathname !== '/login' &&
      requestUrl &&
      !NO_REDIRECT_ON_401.some((prefix) => requestUrl.startsWith(prefix));

    if (!is401) return Promise.reject(error);

    // Intenta refrescar el token antes de redirigir
    if (!isRefreshing) {
      isRefreshing = true;
      return refreshAccessToken(error.config)
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('refresh_token');
          // Rechaza todas las peticiones encoladas para que no queden huérfanas
          pendingRequests.forEach(({ reject }) =>
            reject(new Error('Sesión expirada')),
          );
          pendingRequests = [];
          redirect('/login', { from: window.location.pathname });
          return Promise.reject(error);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    // Otra solicitud ya está refrescando — encolamos esta
    return new Promise<unknown>((resolve, reject) => {
      pendingRequests.push({
        resolve: (newToken: string) => {
          error.config.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(error.config));
        },
        reject,
      });
    });
  },
);

export default api;
