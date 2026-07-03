import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import { User, UserRole } from "../types";
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

function normalizeRole(role: string | undefined): UserRole {
  const valid: UserRole[] = ["Cliente", "Agricultor", "Administrador", "Vendedor"];
  if (role && valid.includes(role as UserRole)) {
    return role as UserRole;
  }
  return "Cliente";
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
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
      const normalizedUser = { ...data, role: normalizeRole(data.role) } as User;
      setState({ user: normalizedUser, token, isLoading: false, isAuthenticated: true });
    } catch {
      await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
      api.defaults.headers.common.Authorization = undefined;
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }

  async function login(email: string, password: string, remember = true) {
    const response = await api.post<LoginResponse>("/auth/login-api/", {
      email,
      password,
      remember,
    });

    const data = response.data;
    if (!data?.success) {
      throw new Error(data?.message || "No se pudo iniciar sesión.");
    }

    const user = { ...data.user, role: normalizeRole(data.user.role) } as User;
    await AsyncStorage.setItem("access_token", data.access);
    await AsyncStorage.setItem("refresh_token", data.refresh);
    await AsyncStorage.setItem("remember_me", remember ? "1" : "0");
    api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setState({
      user,
      token: data.access,
      isLoading: false,
      isAuthenticated: true,
    });
  }

  async function register(fields: Partial<User> & { password: string }) {
    await api.post("/auth/register/", fields);
    // auto-login after registration
    await login(fields.email!, fields.password, true);
  }

  async function logout() {
    await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }

  const value: AuthContextType = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
