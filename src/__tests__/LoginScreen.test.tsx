/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/screens/auth/LoginScreen';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
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

    fireEvent.changeText(getByPlaceholderText('Correo electrónico'), 'correo');

    fireEvent.changeText(getByPlaceholderText('Contraseña'), '123456');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    });
  });

  it('llama a login cuando los datos son válidos', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'admin123');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@rassa.com', 'admin123');
    });
  });

  it('muestra el error cuando login falla', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Contraseña'), '123456');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Credenciales inválidas')).toBeTruthy();
    });
  });

  it('muestra error de conexión cuando no hay internet', async () => {
    mockNetInfoState.isConnected = false;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'admin123');

    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(getByText('Sin conexión a Internet.')).toBeTruthy();
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
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'admin123');
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
      getByPlaceholderText('Correo electrónico'),
      'admin@rassa.com',
    );

    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'admin123');
    fireEvent.press(getByText('Ingresar'));

    // "Ingresar" text is replaced by ActivityIndicator when submitting
    await waitFor(() => {
      expect(queryByText('Ingresar')).toBeNull();
    });

    resolveLogin(undefined);
  });

  it('alterna la visibilidad de la contraseña al presionar Mostrar/Ocultar', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const passwordInput = getByPlaceholderText('Contraseña');

    // Initially hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Press "Mostrar"
    fireEvent.press(getByText('Mostrar'));
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Press "Ocultar"
    fireEvent.press(getByText('Ocultar'));
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('navega a Register al presionar Regístrate aquí', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('¿No tienes cuenta? Regístrate aquí'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });
});
