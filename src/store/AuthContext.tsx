/* globals console, setTimeout -- Required for React Native logging and timers */

import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import axios from 'axios';
import type { AxiosError } from 'axios';

import api from '@/services/api';
import * as Storage from '@/services/storage';
import type { User, UserRole } from '@/types';

interface BackendUser {
  id_usuario: number;
  email: string;
  telefono: string | null;
  role: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  localidad: number | null;
  localidad_nombre: string | null;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

const AUTH_LOGIN_ENDPOINT = '/token/';
const AUTH_PROFILE_ENDPOINT = '/auth/me/';

const ACCESS_TOKEN_KEY = Storage.ACCESS_TOKEN_KEY;
const REFRESH_TOKEN_KEY = Storage.REFRESH_TOKEN_KEY;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  administrator: 'admin',
  administrador: 'admin',

  farmer: 'farmer',
  agricultor: 'farmer',
  productor: 'farmer',

  seller: 'seller',
  vendedor: 'seller',

  buyer: 'buyer',
  cliente: 'buyer',
  comprador: 'buyer',
};

function normalizeRole(role?: string): UserRole {
  const normalized = role?.toLowerCase() ?? '';

  const mappedRole = ROLE_MAP[normalized];

  if (mappedRole) {
    return mappedRole;
  }

  const message =
    `Rol de usuario inválido o no reconocido: "${role}". ` +
    'Denegando acceso para evitar puerta trasera.';

  console.warn(message);

  throw new Error(message);
}

function mapBackendUser(user: Readonly<BackendUser>): User {
  const nombre = user.nombre ?? '';

  const [firstName, ...lastNameParts] = nombre.trim().split(/\s+/);

  return {
    id: user.id_usuario,
    email: user.email,
    username: user.email,
    id_usuario: user.id_usuario,
    telefono: user.telefono,
    role: normalizeRole(user.role),
    first_name: firstName ?? '',
    last_name: lastNameParts.join(' '),
  };
}

function parseLoginError(
  axiosError: AxiosError<Record<string, unknown>>,
): string {
  const responseData = axiosError.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData?.detail) {
    return String(responseData.detail);
  }

  if (Array.isArray(responseData?.non_field_errors)) {
    return responseData.non_field_errors.join(' ');
  }

  if (responseData?.message) {
    return String(responseData.message);
  }

  return axiosError.message || 'Error desconocido';
}

function sanitizeAxiosError(error: AxiosError): {
  status: number | undefined;
  message: string;
} {
  return {
    status: error.response?.status,
    message: error.message,
  };
}

export function AuthProvider({
  children,
}: Readonly<AuthProviderProps>): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const restoreInProgress = useRef(false);

  const clearSession = useCallback(async () => {
    await Promise.allSettled([
      Storage.deleteItemAsync(ACCESS_TOKEN_KEY),
      Storage.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);

    setState((prev) => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }));
  }, []);

  const fetchUserProfile = useCallback(async (): Promise<User> => {
    const { data } = await api.get<{ data: BackendUser }>(
      AUTH_PROFILE_ENDPOINT,
    );

    return mapBackendUser(data.data);
  }, []);

  const applyUserProfile = useCallback((userData: User) => {
    setState((prev) => ({
      ...prev,
      user: userData,
      isAuthenticated: true,
      isLoading: false,
    }));
  }, []);

  const retryFetchProfile = useCallback(async (): Promise<User> => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    return fetchUserProfile();
  }, [fetchUserProfile]);

  const logSafeError = useCallback((prefix: string, err: unknown) => {
    const safe = axios.isAxiosError(err)
      ? sanitizeAxiosError(err)
      : { status: undefined, message: String(err) };

    console.error(prefix, safe);
  }, []);

  const handleRestoreError = useCallback(
    async (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearSession();
        return;
      }

      const isNetworkError = axios.isAxiosError(error) && !error.response;

      if (!isNetworkError) {
        logSafeError('Error al restaurar sesión:', error);
        await clearSession();
        return;
      }

      try {
        const userData = await retryFetchProfile();
        applyUserProfile(userData);
      } catch (retryError) {
        if (
          axios.isAxiosError(retryError) &&
          retryError.response?.status === 401
        ) {
          await clearSession();
          return;
        }

        logSafeError(
          'Restauración de sesión falló después del reintento.',
          retryError,
        );

        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [applyUserProfile, clearSession, logSafeError, retryFetchProfile],
  );

  const restoreSession = useCallback(async () => {
    if (restoreInProgress.current) {
      return;
    }

    restoreInProgress.current = true;

    try {
      const token = await Storage.getItemAsync(ACCESS_TOKEN_KEY);

      if (!token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const userData = await fetchUserProfile();
      applyUserProfile(userData);
    } catch (error) {
      await handleRestoreError(error);
    } finally {
      restoreInProgress.current = false;
    }
  }, [applyUserProfile, fetchUserProfile, handleRestoreError]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (restoreInProgress.current) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const { data } = await api.post<LoginResponse>(AUTH_LOGIN_ENDPOINT, {
          email,
          password,
        });

        if (!data?.access || !data?.refresh) {
          throw new Error(
            'La respuesta del backend no incluyó los tokens de autenticación.',
          );
        }

        await Promise.allSettled([
          Storage.setItemAsync(ACCESS_TOKEN_KEY, data.access),
          Storage.setItemAsync(REFRESH_TOKEN_KEY, data.refresh),
        ]);

        const userData = await fetchUserProfile();

        setState((prev) => ({
          ...prev,
          user: userData,
          isLoading: false,
          isAuthenticated: true,
        }));
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));

        if (axios.isAxiosError(error)) {
          const message = parseLoginError(
            error as AxiosError<Record<string, unknown>>,
          );

          const safe = sanitizeAxiosError(error);

          console.error('Login falló:', safe);

          // eslint-disable-next-line preserve-caught-error -- No adjuntar cause: AxiosError contiene email/contraseña en config.data; Sentry serializa toda la cadena.
          throw new Error(message);
        }

        if (error instanceof Error) {
          // eslint-disable-next-line preserve-caught-error -- No adjuntar cause: el error original podría contener datos sensibles del request.
          throw new Error(error.message);
        }

        // eslint-disable-next-line preserve-caught-error -- Error genérico; no hay causa segura que adjuntar.
        throw new Error('Error desconocido de autenticación');
      }
    },
    [fetchUserProfile],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({
          ...state,
          login,
          logout,
        }),
        [state, login, logout],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
