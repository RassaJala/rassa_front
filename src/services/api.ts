/* globals process -- Expo defines process.env at build time */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosError } from 'axios';
import axios from 'axios';

function resolveBaseURL(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
  const trimmed = configured.replace(/\/$/, '');

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach JWT token to every request
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios interceptors mutate config internally
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle 401 and clear tokens when the request is unauthorized.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
    throw error;
  },
);

export default api;
