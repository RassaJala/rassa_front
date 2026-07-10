/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/screens/auth/LoginScreen';

const mockLogin = jest.fn();

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
  }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza correctamente', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByPlaceholderText('Correo electrónico')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
    expect(getByText('Ingresar')).toBeTruthy();
  });

  it('muestra error cuando los campos están vacíos', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Ingresa tu correo y contraseña.')).toBeTruthy();
    });
  });

  it('valida un correo inválido', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'correo'
    );

    fireEvent.changeText(
      getByPlaceholderText('Contraseña'),
      '123456'
    );

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(
        getByText('Ingresa un correo electrónico válido.')
      ).toBeTruthy();
    });
  });

  it('llama a login cuando los datos son válidos', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com'
    );

    fireEvent.changeText(
      getByPlaceholderText('Contraseña'),
      'admin123'
    );

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'admin@rassa.com',
        'admin123'
      );
    });
  });

  it('muestra el error cuando login falla', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com'
    );

    fireEvent.changeText(
      getByPlaceholderText('Contraseña'),
      '123456'
    );

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Credenciales inválidas')).toBeTruthy();
    });
  });
});
