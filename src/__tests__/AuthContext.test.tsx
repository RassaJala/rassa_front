/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '../store/AuthContext';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

jest.mock('axios', () => {
  const mockAxios = jest.fn() as any;
  mockAxios.create = jest.fn(() => mockAxios);
  mockAxios.get = jest.fn();
  mockAxios.post = jest.fn();
  mockAxios.isAxiosError = jest.fn((err: any) => err?.isAxiosError === true);
  mockAxios.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return {
    __esModule: true,
    default: mockAxios,
  };
});

const { default: api } = require('../services/api');

function TestComponent() {
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();

  return (
    <View>
      <Text testID="auth-status">
        {isAuthenticated ? 'Autenticado' : 'No Autenticado'}
      </Text>
      <Text testID="loading-status">{isLoading ? 'Cargando' : 'Listo'}</Text>
      <Text testID="user-role">{user?.role ?? 'Sin Rol'}</Text>
      <Text testID="user-name">{user?.first_name ?? 'Sin Nombre'}</Text>
      <Text
        testID="login-btn"
        onPress={() => {
          login('test@test.com', 'password').catch(() => {});
        }}
      >
        Login
      </Text>
      <Text
        testID="logout-btn"
        onPress={() => {
          void logout();
        }}
      >
        Logout
      </Text>
    </View>
  );
}

const DEFAULT_BACKEND_USER = {
  id_usuario: 1,
  email: 'test@test.com',
  telefono: null,
  role: 'buyer',
  nombre: 'Test User',
  apellido_paterno: null,
  apellido_materno: null,
  fecha_nacimiento: null,
  genero: null,
  direccion: null,
  localidad: null,
  localidad_nombre: null,
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advancePastRetryDelay = async (): Promise<void> => {
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });
  };

  const waitForLoading = async (
    getByTestId: (testId: string) => any,
  ): Promise<void> => {
    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });
  };

  // ── normalizeRole ─────────────────────────────────────

  it('rechaza un rol desconocido y lanza error', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: '123', refresh: '456' },
    });
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { ...DEFAULT_BACKEND_USER, role: 'hacker' } },
    });

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Rol de usuario inválido o no reconocido: "hacker". Denegando acceso para evitar puerta trasera.',
      );
    });
    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    consoleWarnSpy.mockRestore();
  });

  it('mapea correctamente un rol válido y nombre parcial', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: '123', refresh: '456' },
    });
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { ...DEFAULT_BACKEND_USER, role: 'ADMIN', nombre: null } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('Autenticado');
    });
    expect(getByTestId('user-role').props.children).toBe('admin');
    expect(getByTestId('user-name').props.children).toBe('');
  });

  // ── Login success flow ─────────────────────────────────

  it('login exitoso: almacena tokens, mapea usuario y actualiza estado', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: 'token123', refresh: 'refresh456' },
    });
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: DEFAULT_BACKEND_USER },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('Autenticado');
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'access_token',
      'token123',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'refresh_token',
      'refresh456',
    );
    expect(getByTestId('user-role').props.children).toBe('buyer');
    expect(getByTestId('user-name').props.children).toBe('Test');
  });

  // ── parseLoginError branches ──────────────────────────

  it('parsea error de login cuando response.data es string', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = { status: 400, data: 'Email inválido' };
    axiosError.config = { url: '/token/' };
    (api.post as jest.Mock).mockRejectedValueOnce(axiosError);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  it('parsea error de login con detail', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 401,
      data: { detail: 'Credenciales inválidas.' },
    };
    axiosError.config = { url: '/token/' };
    (api.post as jest.Mock).mockRejectedValueOnce(axiosError);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  it('parsea error de login con non_field_errors', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 400,
      data: { non_field_errors: ['Error 1', 'Error 2'] },
    };
    axiosError.config = { url: '/token/' };
    (api.post as jest.Mock).mockRejectedValueOnce(axiosError);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  // ── restoreSession ────────────────────────────────────

  it('restoreSession: autentica con token válido', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');
    (api.get as jest.Mock).mockResolvedValue({
      data: { data: DEFAULT_BACKEND_USER },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('Autenticado');
    });
    expect(getByTestId('user-role').props.children).toBe('buyer');
  });

  it('restoreSession: reintenta en error de red y recupera sesión', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const networkError = new Error('Network Error') as any;
    networkError.isAxiosError = true;
    networkError.response = undefined;

    (api.get as jest.Mock)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { data: DEFAULT_BACKEND_USER } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await advancePastRetryDelay();

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('Autenticado');
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('restoreSession: reintento fallido limpia sesión', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const networkError = new Error('Network Error') as any;
    networkError.isAxiosError = true;
    networkError.response = undefined;

    (api.get as jest.Mock).mockRejectedValue(networkError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await advancePastRetryDelay();

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });

    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('restoreSession: limpia tokens en error 401', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const authError = new Error('Unauthorized') as any;
    authError.isAxiosError = true;
    authError.response = { status: 401, data: {} };
    (api.get as jest.Mock).mockRejectedValueOnce(authError);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    });
    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  it('restoreSession: error de lógica (rol inválido) limpia sesión', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { ...DEFAULT_BACKEND_USER, role: 'hacker' } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });

    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('restoreSession: no token guardado queda no autenticado', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });

    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  // ── Loading state ─────────────────────────────────────

  it('loading state: isLoading es true antes de restaurar sesión', () => {
    (SecureStore.getItemAsync as jest.Mock).mockReturnValue(
      new Promise(() => {
        /* never resolves — keep isLoading true */
      }),
    );

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(getByTestId('loading-status').props.children).toBe('Cargando');
  });

  // ── Login: isLoading ──────────────────────────────────

  it('login: isLoading no cambia mientras se procesa', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    let resolvePost: (value: any) => void = () => {};
    (api.post as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    expect(getByTestId('loading-status').props.children).toBe('Listo');

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });

    await act(async () => {
      resolvePost({
        data: { access: 'token123', refresh: 'refresh456' },
      });

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: DEFAULT_BACKEND_USER },
      });
    });

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('Listo');
    });
  });

  // ── Logout ────────────────────────────────────────────

  it('limpia tokens y estado al hacer logout', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');
    (api.get as jest.Mock).mockResolvedValue({
      data: { data: DEFAULT_BACKEND_USER },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('Autenticado');
    });

    await act(async () => {
      fireEvent.press(getByTestId('logout-btn'));
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
  });

  // ── Login fallos ─────────────────────────────────────

  it('login falla con 401 en /token/ (credenciales inválidas)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const axiosError = new Error('Unauthorized') as any;
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 401,
      data: { detail: 'Invalid credentials' },
    };
    axiosError.config = { url: '/token/' };
    (api.post as jest.Mock).mockRejectedValueOnce(axiosError);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  it('login falla con error no-Axios (red caída)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.post as jest.Mock).mockRejectedValueOnce(
      new TypeError('fetch failed'),
    );

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitForLoading(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });

  // ── sanitizeAxiosError: no expone tokens ──────────────

  it('restoreSession: console.error no expone tokens JWT', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const networkError = new Error('Network Error') as any;
    networkError.isAxiosError = true;
    networkError.response = undefined;
    networkError.config = { headers: { Authorization: 'Bearer secret-token' } };

    (api.get as jest.Mock).mockRejectedValue(networkError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await advancePastRetryDelay();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    const allCalls = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(allCalls).not.toContain('secret-token');
    expect(allCalls).not.toContain('Bearer');

    consoleErrorSpy.mockRestore();
  });
});
