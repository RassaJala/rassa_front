/* globals process -- Expo defines process.env at build time */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosError } from 'axios';
import axios from 'axios';

const api = axios.create({
  // @ts-ignore process is a global node variable.
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios interceptors mutate config internally
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear token and let auth context handle redirect
api.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios interceptors mutate config internally
  (response) => response,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Axios interceptors mutate config internally
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
    throw error;
  },
);

export default api;
