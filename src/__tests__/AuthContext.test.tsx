/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '../store/AuthContext';

// Mock SecureStore before anything else
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

// Mock axios so the real api module creates a mock-based instance
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

// After the axios mock, import api — it will create a mock-based instance
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
  apellido_paterno: 'User',
  apellido_materno: null,
  fecha_nacimiento: '1990-01-01',
  genero: 'M',
  direccion: 'Calle Falsa 123',
  localidad: 1,
  localidad_nombre: 'Test Localidad',
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Rol de usuario inválido o no reconocido: "hacker". Denegando acceso para evitar puerta trasera.',
    );
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

  it('restoreSession: mantiene sesión en error de red o 5xx', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const networkError = new Error('Network Error') as any;
    networkError.isAxiosError = true;
    networkError.response = undefined;
    (api.get as jest.Mock).mockRejectedValueOnce(networkError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });
  });

  it('restoreSession: limpia tokens en error 4xx', async () => {
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

  // ── Login fallos específicos ─────────────────────────

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

    await act(async () => {
      fireEvent.press(getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    });
  });
});
