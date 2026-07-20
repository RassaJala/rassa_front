import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../hooks/useAuth';
import type { AuthState, User } from '../types';

function loadAuthState(): AuthState {
  try {
    const token = sessionStorage.getItem('token');
    const raw = sessionStorage.getItem('user');
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as User;
        return { user, token, isAuthenticated: true, isLoading: false };
      } catch {
        sessionStorage.removeItem('user');
      }
    }
  } catch {
    // sessionStorage no disponible (private browsing, etc.)
  }
  return { user: null, token: null, isAuthenticated: false, isLoading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadAuthState);

  const login = useCallback((token: string, user: User) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    // ponytail: sync logout across tabs
    const handler = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
