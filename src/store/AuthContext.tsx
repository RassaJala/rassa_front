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

import type { AxiosError } from 'axios';
import axios from 'axios';

import api, { registerAuthExpiredCallback } from '@/services/api';
import * as Storage from '@/services/storage';
import type {
  ApiResponse,
  ChangePasswordPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
  UserRole,
} from '@/types';

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
  municipio_id?: number | null;
  municipio_nombre?: string | null;
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
  isRegistering: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
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
    nombre: user.nombre ?? '',
    apellido_paterno: user.apellido_paterno ?? '',
    apellido_materno: user.apellido_materno,
    fecha_nacimiento: user.fecha_nacimiento ?? '',
    genero: user.genero ?? '',
    direccion: user.direccion ?? '',
    localidad: user.localidad ?? 0,
    localidad_nombre: user.localidad_nombre,
    municipio_id: user.municipio_id ?? null,
    municipio_nombre: user.municipio_nombre ?? null,
  };
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const dict = data as Record<string, unknown>;
  if (typeof dict.detail === 'string') return dict.detail;
  if (typeof dict.message === 'string') return dict.message;
  if (Array.isArray(dict.non_field_errors)) {
    return dict.non_field_errors.join(' ');
  }

  // Iterate over all fields to find any validation errors (which are strings or arrays of strings)
  for (const [field, value] of Object.entries(dict)) {
    if (
      field === 'detail' ||
      field === 'message' ||
      field === 'non_field_errors'
    ) {
      continue;
    }
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
  }

  return null;
}

export function parseAuthError(
  axiosError: Readonly<AxiosError<Record<string, unknown>>>,
  context: 'login' | 'register' | 'updateProfile' | 'changePassword',
): string {
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;

  if (status === 429) {
    return 'Límite de peticiones excedido. Inténtalo más tarde.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor no está disponible temporalmente. Inténtalo más tarde.';
  }

  if (typeof data === 'string') {
    return data;
  }

  const extractedMsg = extractErrorMessage(data);
  if (extractedMsg !== null) {
    return extractedMsg;
  }

  if (status === 401) {
    return context === 'login'
      ? 'Credenciales inválidas.'
      : 'Sesión expirada o no autorizada.';
  }
  if (status === 403) return 'Acceso denegado.';
  if (status === 500) return 'Error interno del servidor. Inténtalo más tarde.';

  return 'Error de conexión con el servidor.';
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
}: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<Readonly<AuthState>>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isRegistering: false,
  });

  const isRegisteringRef = useRef(false);
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
    const delay = 1000 + Math.random() * 1000;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
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

        await clearSession();
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
          const message = parseAuthError(
            error as AxiosError<Record<string, unknown>>,
            'login',
          );

          const safe = sanitizeAxiosError(error);

          console.error('Login falló:', safe);

          throw new Error(message, { cause: error });
        }

        if (error instanceof Error) {
          throw new Error(error.message, { cause: error });
        }

        throw new Error('Error desconocido de autenticación', { cause: error });
      }
    },
    [fetchUserProfile],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    // Prevent double submission
    if (isRegisteringRef.current) {
      throw new Error('Ya hay un registro en curso. Por favor, espera.');
    }

    // Set registering flag
    isRegisteringRef.current = true;
    setState((prev) => ({ ...prev, isRegistering: true }));

    try {
      const {
        email,
        password,
        telefono,
        role,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        sexo,
        domicilio,
        fk_localidad,
      } = payload;

      const { data: responseBody } = await api.post<
        ApiResponse<BackendUser & { access: string; refresh: string }>
      >('/auth/register/', {
        email,
        password,
        telefono,
        role,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        sexo,
        domicilio,
        fk_localidad,
      });

      const user = responseBody.data;

      if (!user?.access || !user?.refresh) {
        throw new Error('La respuesta del backend no incluyó los tokens.');
      }

      await Promise.all([
        Storage.setItemAsync(ACCESS_TOKEN_KEY, user.access),
        Storage.setItemAsync(REFRESH_TOKEN_KEY, user.refresh),
      ]);

      const mappedUser = mapBackendUser(user);
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({
        ...prev,
        user: mappedUser,
        isLoading: false,
        isAuthenticated: true,
        isRegistering: false,
      }));
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({ ...prev, isRegistering: false }));
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<Record<string, unknown>>;
        const message = parseAuthError(axiosError, 'register');

        throw new Error(message, { cause: error });
      }
      throw error;
    } finally {
      isRegisteringRef.current = false;
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    try {
      const { data: responseBody } = await api.patch<ApiResponse<BackendUser>>(
        '/auth/me/',
        payload,
      );

      const mappedUser = mapBackendUser(responseBody.data);
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Local setState callback parameter
      setState((prev) => ({
        ...prev,
        user: mappedUser,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<Record<string, unknown>>;
        const message = parseAuthError(axiosError, 'updateProfile');

        throw new Error(message, { cause: error });
      }
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    try {
      await api.post('/auth/change-password/', payload);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<Record<string, unknown>>;
        const message = parseAuthError(axiosError, 'changePassword');

        throw new Error(message, { cause: error });
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  // Register logout callback so the API interceptor can force-logout on 401
  useEffect(() => {
    registerAuthExpiredCallback(() => {
      void clearSession();
    });
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({
          ...state,
          login,
          logout,
          register,
          updateProfile,
          changePassword,
        }),
        [state, login, logout, register, updateProfile, changePassword],
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
