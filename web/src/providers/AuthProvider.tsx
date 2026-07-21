import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { AuthContext } from '../hooks/useAuth';
import type { AuthState, User } from '../types';
import api from '../services/api';

function loadInitialState(): { token: string | null } {
  try {
    const token = localStorage.getItem('token');
    return { token };
  } catch {
    // localStorage no disponible (private browsing, etc.)
    return { token: null };
  }
}

function initialState(): AuthState {
  const { token } = loadInitialState();
  if (token) {
    return { user: null, token, isAuthenticated: false, isLoading: true };
  }
  return { user: null, token: null, isAuthenticated: false, isLoading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  // Validate token against server on mount (only when restoring session)
  useEffect(() => {
    if (!state.token || state.isAuthenticated) return;

    let cancelled = false;
    api
      .get<{ data: Record<string, unknown> }>('/auth/me/')
      .then(({ data }) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const raw = data.data ?? data;
        const user: User = {
          id: raw.id as number,
          email: raw.email as string,
          nombre: raw.nombre as string,
          rol: raw.rol as User['rol'],
          apellido_paterno: (raw.apellido_paterno as string) ?? '',
          apellido_materno: raw.apellido_materno as string | undefined,
          telefono: raw.telefono as string | undefined,
          fecha_nacimiento: raw.fecha_nacimiento as string | undefined,
          genero: raw.genero as string | undefined,
          direccion: raw.direccion as string | undefined,
          municipio_id: raw.municipio_id as number | undefined,
          municipio_nombre: raw.municipio_nombre as string | undefined,
          localidad: raw.localidad as number | undefined,
          localidad_nombre: raw.localidad_nombre as string | undefined,
        };
        setState({
          user,
          token: state.token,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Solo limpiamos la sesión si el token es inválido (401).
        // Errores de red transitorios (timeout, DNS, 5xx) NO destruyen la sesión.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('refresh_token');
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } else {
          // Error transitorio — dejamos el token, mostramos no autenticado
          // El interceptor de api.ts reintentará con refresh si es necesario
          setState({
            user: null,
            token: state.token,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.token]);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    // Solo guardamos datos mínimos no sensibles en localStorage
    localStorage.setItem(
      'user',
      JSON.stringify({ id: user.id, email: user.email, rol: user.rol }),
    );
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('refresh_token');
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
