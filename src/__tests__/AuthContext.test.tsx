/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import api from '../services/api';
import { AuthProvider, useAuth } from '../store/AuthContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

jest.mock('../services/api', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    },
  };
});

function TestComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  return (
    <View>
      <Text testID="auth-status">
        {isAuthenticated ? 'Autenticado' : 'No Autenticado'}
      </Text>
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

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería rechazar un rol desconocido en normalizeRole durante el login', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: '123', refresh: '456' },
    });
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@test.com',
        username: 'test',
        id_usuario: 1,
        telefono: '12345',
        rol: 'hacker',
        nombre: 'Malicious User',
      },
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
      expect.stringContaining('Rol no reconocido'),
    );
    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
    consoleWarnSpy.mockRestore();
  });

  it('debería mapear correctamente un rol válido y nombre parcial en mapBackendUser', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: '123', refresh: '456' },
    });
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@test.com',
        username: 'test',
        id_usuario: 1,
        telefono: null,
        rol: 'ADMIN',
        nombre: null,
      },
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

  it('debería mantener la sesión si restoreSession falla por un error de red o 5xx', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('valid_token');

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
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });

  it('debería limpiar tokens y estado al hacer logout', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('valid_token');
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 1,
        email: 't',
        username: 't',
        id_usuario: 1,
        telefono: null,
        rol: 'buyer',
        nombre: 'Test',
      },
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

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      'access_token',
      'refresh_token',
    ]);
    expect(getByTestId('auth-status').props.children).toBe('No Autenticado');
  });
});
