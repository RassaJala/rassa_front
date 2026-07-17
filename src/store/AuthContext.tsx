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
  /** Django Usuario primary key */
  id_usuario: number;
  email: string;
  telefono: string | null;
  /** English key from Django UserSerializer (not 'rol') */
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
// Keys are defined in storage.ts; import for deduplication (W3)
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
      const { data: body } = await api.get<{ data: BackendUser }>(
        AUTH_PROFILE_ENDPOINT,
      );
      const userData = body.data;
      const mappedUser = mapBackendUser(userData);
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({
        ...prev,
        user: mappedUser,
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch (error) {
      // Only clear session on 401 (token expired/invalid).
      // 403, 429, network errors, 5xx should NOT log the user out (C1).
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearSession();
        return;
      }
      // Transient error — one retry after 1s delay (C2)
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { data: retryBody } = await api.get<{ data: BackendUser }>(
          AUTH_PROFILE_ENDPOINT,
        );
        const retryUserData = retryBody.data;
        const retryMappedUser = mapBackendUser(retryUserData);
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
        setState((prev) => ({
          ...prev,
          user: retryMappedUser,
          isLoading: false,
          isAuthenticated: true,
        }));
      } catch {
        // Still failing — show app unauthenticated, tokens remain valid
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
        setState((prev) => ({ ...prev, isLoading: false }));
      }
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

      const { data: profileBody } = await api.get<{ data: BackendUser }>(
        AUTH_PROFILE_ENDPOINT,
      );
      const userData = profileBody.data;
      const mappedUser = mapBackendUser(userData);
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
        const logMessage = `Error de autenticación${statusStr}: ${message}`;
        console.error(logMessage, {
          status,
          responseData,
          url: axiosError.config?.url,
        });
        /* eslint-disable-next-line preserve-caught-error -- No incluimos el AxiosError
         * como cause porque contiene email/password en config.data y Sentry
         * serializaría las credenciales en la cadena de errores. */
        throw new Error(message);
      }

      console.error('Login error', error);
      throw error instanceof Error
        ? error
        : new Error('Error desconocido de autenticación');
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
