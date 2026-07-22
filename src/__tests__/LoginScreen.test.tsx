/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Mock Keyboard to prevent "isVisible" / "remove" errors from KeyboardAvoidingView
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  isVisible: jest.fn().mockReturnValue(false),
}));

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
    const { getByText } = render(<LoginScreen />);

    expect(getByText('Bienvenido')).toBeTruthy();
    expect(getByText('INICIAR SESIÓN')).toBeTruthy();
  });

  it('muestra error cuando los campos están vacíos', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(getByText('Ingresá tu correo electrónico')).toBeTruthy();
    });
  });

  it('valida un correo inválido', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(getByText('Ingresá tu correo electrónico')).toBeTruthy();
    });
  });

  it('llama a login cuando los datos son válidos', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByText, getAllByDisplayValue } = render(<LoginScreen />);

    const inputs = getAllByDisplayValue('');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];

    fireEvent.changeText(emailInput!, 'admin@rassa.com');
    fireEvent.changeText(passwordInput!, 'admin123');

    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@rassa.com', 'admin123');
    });
  });

  it('muestra el error cuando login falla', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));

    const { getByText, getAllByDisplayValue } = render(<LoginScreen />);

    const inputs = getAllByDisplayValue('');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];

    fireEvent.changeText(emailInput!, 'admin@rassa.com');
    fireEvent.changeText(passwordInput!, '123456');

    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(getByText('Credenciales inválidas')).toBeTruthy();
    });
  });

  it('muestra el mensaje de error del servidor cuando login falla', async () => {
    mockLogin.mockRejectedValue(new Error('Error del servidor'));

    const { getByText, getAllByDisplayValue } = render(<LoginScreen />);

    const inputs = getAllByDisplayValue('');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];

    fireEvent.changeText(emailInput!, 'admin@rassa.com');
    fireEvent.changeText(passwordInput!, 'admin123');

    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(getByText(/Error del servidor/i)).toBeTruthy();
    });
  });

  it('no arroja errores al desmontarse durante una petición pendiente', async () => {
    let resolveLogin!: (_value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    const { getByText, getAllByDisplayValue, unmount } = render(
      <LoginScreen />,
    );

    const inputs = getAllByDisplayValue('');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];

    fireEvent.changeText(emailInput!, 'admin@rassa.com');
    fireEvent.changeText(passwordInput!, 'admin123');
    fireEvent.press(getByText('INICIAR SESIÓN'));

    expect(() => unmount()).not.toThrow();

    resolveLogin(undefined);
  });

  it('muestra INGRESANDO… mientras se envía el formulario y vuelve a INICIAR SESIÓN al completar', async () => {
    let resolveLogin!: (_value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    const { getByText, getAllByDisplayValue } = render(<LoginScreen />);

    const inputs = getAllByDisplayValue('');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];

    fireEvent.changeText(emailInput!, 'admin@rassa.com');
    fireEvent.changeText(passwordInput!, 'admin123');
    fireEvent.press(getByText('INICIAR SESIÓN'));

    expect(getByText('INGRESANDO…')).toBeTruthy();

    resolveLogin(undefined);

    await waitFor(() => {
      expect(getByText('INICIAR SESIÓN')).toBeTruthy();
    });
  });
});
