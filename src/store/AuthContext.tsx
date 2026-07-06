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

import api from '~/services/api';
import type { User } from '~/types';

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
      const { data } = await api.get<User>('/auth/me/');
      setState({ user: data, token, isLoading: false, isAuthenticated: true });
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
    const { data } = await api.post<{ access: string; refresh: string }>(
      '/token/',
      { email, password },
    );
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    // fetch user profile
    const { data: user } = await api.get<User>('/auth/me/');
    setState({
      user,
      token: data.access,
      isLoading: false,
      isAuthenticated: true,
    });
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
