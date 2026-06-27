import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const baseURL = process.env.EXPO_PUBLIC_API_URL || `http://${fallbackHost}:8000/api`;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear token and let auth context handle redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
    }
    return Promise.reject(error);
  }
);

export default api;
