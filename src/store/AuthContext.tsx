import type { ReactNode } from 'react';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosError } from 'axios';

import api from '~/services/api';
import type { User, UserRole } from '~/types';

interface BackendUser {
  id: number;
  email: string;
  username: string;
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

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/* eslint-disable no-unused-vars -- interface params are type-only, not runtime bindings */
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    data: Readonly<Partial<User> & { password: string }>,
  ) => Promise<void>;
  logout: () => Promise<void>;
}
/* eslint-enable no-unused-vars -- re-enable after interface */

interface AuthProviderProps {
  readonly children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeRole(role?: string): UserRole {
  const normalized = role?.toLowerCase();

  if (
    normalized === 'admin' ||
    normalized === 'administrator' ||
    normalized === 'administrador'
  ) {
    return 'admin';
  }

  if (
    normalized === 'farmer' ||
    normalized === 'productor' ||
    normalized === 'seller' ||
    normalized === 'agricultor'
  ) {
    return 'farmer';
  }

  return 'buyer';
}

function mapBackendUser(user: BackendUser): User {
  const [firstName, ...lastNameParts] = user.nombre.trim().split(/\s+/);

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

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- AuthProviderProps already has readonly properties
export function AuthProvider({
  children,
}: Readonly<AuthProviderProps>): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Readonly<AuthState> already applied
        setState((s: Readonly<AuthState>) => ({ ...s, isLoading: false }));
        return;
      }
      const { data } = await api.get<BackendUser>(AUTH_PROFILE_ENDPOINT);
      setState({
        user: mapBackendUser(data),
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    async function requestTokens(payload: Record<string, string>) {
      return api.post<LoginResponse>(AUTH_LOGIN_ENDPOINT, payload);
    }

    try {
      const loginPayload = {
        email,
        password,
        username: email,
      };

      let response = await requestTokens(loginPayload);

      if (!response.data?.access || !response.data?.refresh) {
        response = await requestTokens({ password, username: email });
      }

      const { data } = response;

      if (!data?.access || !data?.refresh) {
        throw new Error('La respuesta del backend no incluyó los tokens.');
      }

      await AsyncStorage.setItem('access_token', data.access);
      await AsyncStorage.setItem('refresh_token', data.refresh);

      const { data: user } = await api.get<BackendUser>(AUTH_PROFILE_ENDPOINT);
      setState({
        user: mapBackendUser(user),
        token: data.access,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      if ((error as AxiosError).isAxiosError) {
        const axiosError = error as AxiosError<Record<string, unknown>>;
        const responseData = axiosError.response?.data;
        const status = axiosError.response?.status;

        const message =
          typeof responseData === 'string'
            ? responseData
            : responseData?.detail ??
              (Array.isArray(responseData?.non_field_errors)
                ? responseData.non_field_errors.join(' ')
                : undefined) ??
              responseData?.message ??
              (responseData && JSON.stringify(responseData)) ??
              axiosError.message;

        const errorMessage = `Error de autenticación (${status}): ${message}`;
        console.error(errorMessage, {
          status,
          responseData,
          url: axiosError.config?.url,
        });
        throw new Error(errorMessage);
      }

      console.error('Login error', error);
      throw error instanceof Error
        ? error
        : new Error('Error desconocido de autenticación');
    }
  }, []);

  const register = useCallback(
    async (fields: Readonly<Partial<User> & { password: string }>) => {
      await api.post('/auth/register/', fields);
      // auto-login after registration
      if (fields.email) {
        await login(fields.email, fields.password);
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({ ...state, login, register, logout }),
        [state, login, register, logout],
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
