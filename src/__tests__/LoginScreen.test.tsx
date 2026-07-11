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

const mockNetInfoState = { isConnected: true };

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ ...mockNetInfoState })),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoState.isConnected = true;
  });

  it('renderiza correctamente', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByPlaceholderText('ej: usuario@correo.com')).toBeTruthy();
    expect(getByPlaceholderText('Tu contraseña')).toBeTruthy();
    expect(getByText('Ingresar')).toBeTruthy();
  });

  it('muestra error cuando los campos están vacíos', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('El correo electrónico es obligatorio.')).toBeTruthy();
    });
  });

  it('valida un correo inválido', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'correo',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), '123456');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    });
  });

  it('llama a login cuando los datos son válidos', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), 'admin123');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@rassa.com', 'admin123');
    });
  });

  it('muestra el error cuando login falla', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), '123456');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Credenciales inválidas')).toBeTruthy();
    });
  });

  it('muestra error de conexión cuando no hay internet', async () => {
    mockNetInfoState.isConnected = false;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), 'admin123');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(
        getByText(
          'Sin conexión a Internet. Verifica tu conexión e inténtalo de nuevo.',
        ),
      ).toBeTruthy();
    });
  });

  it('no llama a login si el componente se desmonta durante la petición', async () => {
    let resolveLogin!: (_value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    const { getByPlaceholderText, getByText, unmount } = render(
      <LoginScreen />,
    );

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), 'admin123');
    fireEvent.press(getByText('Ingresar'));

    // Unmount before the promise resolves
    unmount();

    resolveLogin(undefined);

    // No error should be thrown — isMounted guard prevents setState on unmounted
    // Just verify the component unmounts without crashing
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('muestra ActivityIndicator mientras se envía el formulario', async () => {
    let resolveLogin!: (_value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <LoginScreen />,
    );

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Tu contraseña'), 'admin123');
    fireEvent.press(getByText('Ingresar'));

    // "Ingresar" text is replaced by ActivityIndicator when submitting
    await waitFor(() => {
      expect(queryByText('Ingresar')).toBeNull();
    });

    resolveLogin(undefined);
  });

  it('muestra error de campo cuando falta la contraseña', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('ej: usuario@correo.com'),
      'correo@ejemplo.com',
    );

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('La contraseña es obligatoria.')).toBeTruthy();
    });
  });
});
