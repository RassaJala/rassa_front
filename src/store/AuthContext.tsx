/* globals console -- Allow console methods for logging */
import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AxiosError } from 'axios';
import axios from 'axios';

import api from '@/services/api';
import * as Storage from '@/services/storage';
import type { User, UserRole } from '@/types';

interface BackendUser {
  /** Database primary key (Django ID) */
  id: number;
  email: string;
  username: string;
  /** External user ID from the authentication provider or related profile ID */
  id_usuario: number;
  telefono: string | null;
  rol: string;
  nombre: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

const AUTH_LOGIN_ENDPOINT = '/token/';
const AUTH_PROFILE_ENDPOINT = '/auth/me/';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/* eslint-disable no-unused-vars -- interface params are type-only, not runtime bindings */
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
/* eslint-enable no-unused-vars -- re-enable after interface */

interface AuthProviderProps {
  readonly children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  administrator: 'admin',
  administrador: 'admin',
  farmer: 'farmer',
  productor: 'farmer',
  seller: 'farmer',
  agricultor: 'farmer',
  vendedor: 'farmer',
  buyer: 'buyer',
  comprador: 'buyer',
  cliente: 'buyer',
};

function normalizeRole(role?: string): UserRole {
  const normalized = role?.toLowerCase() ?? '';
  // eslint-disable-next-line security/detect-object-injection -- ROLE_MAP is a safe static dictionary
  const mappedRole = ROLE_MAP[normalized];

  if (mappedRole) {
    return mappedRole;
  }

  const message = `Rol de usuario inválido o no reconocido: "${role}"`;
  console.warn(`${message}. Denegando acceso para evitar puerta trasera.`);
  throw new Error(message);
}

function mapBackendUser(user: Readonly<BackendUser>): User {
  const nombre = user.nombre ?? '';
  const [firstName, ...lastNameParts] = nombre.trim().split(/\s+/);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    id_usuario: user.id_usuario,
    telefono: user.telefono,
    role: normalizeRole(user.rol),
    first_name: firstName ?? '',
    last_name: lastNameParts.join(' '),
  };
}

function parseLoginError(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- External library type
  axiosError: AxiosError<Record<string, unknown>>,
): string {
  const responseData = axiosError.response?.data;
  if (typeof responseData === 'string') return responseData;
  if (responseData?.detail) return String(responseData.detail);
  if (Array.isArray(responseData?.non_field_errors))
    return responseData.non_field_errors.join(' ');
  if (responseData?.message) return String(responseData.message);
  if (responseData) return 'Error desconocido del servidor.';
  return axiosError.message;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- AuthProviderProps already has readonly properties
export function AuthProvider({
  children,
}: Readonly<AuthProviderProps>): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const clearSession = useCallback(async () => {
    await Promise.all([
      Storage.deleteItemAsync(ACCESS_TOKEN_KEY),
      Storage.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
    setState((prev) => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }));
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const token = await Storage.getItemAsync(ACCESS_TOKEN_KEY);
      if (!token) {
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const { data } = await api.get<BackendUser>(AUTH_PROFILE_ENDPOINT);
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({
        ...prev,
        user: mapBackendUser(data),
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch (error) {
      // Do not clear tokens on 5xx or Network Errors (undefined response)
      if (
        axios.isAxiosError(error) &&
        (!error.response || error.response.status >= 500)
      ) {
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      await clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const loginPayload = {
        email,
        password,
      };

      const { data } = await api.post<LoginResponse>(
        AUTH_LOGIN_ENDPOINT,
        loginPayload,
      );

      if (!data?.access || !data?.refresh) {
        throw new Error('La respuesta del backend no incluyó los tokens.');
      }

      await Promise.all([
        Storage.setItemAsync(ACCESS_TOKEN_KEY, data.access),
        Storage.setItemAsync(REFRESH_TOKEN_KEY, data.refresh),
      ]);

      const { data: user } = await api.get<BackendUser>(AUTH_PROFILE_ENDPOINT);
      const mappedUser = mapBackendUser(user);
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({
        ...prev,
        user: mappedUser,
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<Record<string, unknown>>;
        const responseData = axiosError.response?.data;
        const status = axiosError.response?.status;

        const message = parseLoginError(axiosError);

        const statusStr = status ? ` (${status})` : '';
        const errorMessage = `Error de autenticación${statusStr}: ${message}`;
        console.error(errorMessage, {
          status,
          responseData,
          url: axiosError.config?.url,
        });
        throw new Error(errorMessage, { cause: error });
      }

      console.error('Login error', error);
      throw error instanceof Error
        ? error
        : new Error('Error desconocido de autenticación', { cause: error });
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({ ...state, login, logout }),
        [state, login, logout],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
