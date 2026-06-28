import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import { User } from "../types";
import { LoginResponse } from "../types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: Partial<User> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      const { data } = await api.get<User>("/auth/me/");
      setState({ user: data, token, isLoading: false, isAuthenticated: true });
    } catch {
      await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
      api.defaults.headers.common.Authorization = undefined;
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    }
  }

  async function login(email: string, password: string, remember = true) {
    let response;

    try {
      response = await api.post<LoginResponse>("/auth/login-api/", { email, password, remember });
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      response = await api.post<LoginResponse>("/token/", { email, password, remember });
    }

    const data = response.data;
    if (!data?.success) {
      throw new Error(data?.message || "No se pudo iniciar sesión.");
    }

    const user = data.user;
    await AsyncStorage.setItem("access_token", data.access);
    await AsyncStorage.setItem("refresh_token", data.refresh);
    await AsyncStorage.setItem("remember_me", remember ? "1" : "0");
    api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setState({ user, token: data.access, isLoading: false, isAuthenticated: true });
  }

  async function register(fields: Partial<User> & { password: string }) {
    await api.post("/auth/register/", fields);
    // auto-login after registration
    await login(fields.email!, fields.password, true);
  }

  async function logout() {
    await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
