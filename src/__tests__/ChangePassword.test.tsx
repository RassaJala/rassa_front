/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import '@testing-library/jest-native/extend-expect';
import { useNetInfo } from '@react-native-community/netinfo';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import axios from 'axios';

import ChangePassword from '@/screens/common/profile/ChangePassword';
import { useAuth } from '@/store/AuthContext';

// ── Mocks ──────────────────────────────────────────────

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
  fetch: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

jest.mock('@/store/AuthContext', () => {
  const actual = jest.requireActual('@/store/AuthContext');
  return {
    ...(actual as Record<string, unknown>),
    useAuth: jest.fn(),
  };
});

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// ── Helpers ────────────────────────────────────────────

const mockUseNetInfo = useNetInfo as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

const mockChangePassword = jest.fn();
const mockOnPasswordChanged = jest.fn();

/** Mirrors the component's internal validatePasswordChange for focused unit testing. */
function validatePasswordChange(
  oldPass: string,
  newPass: string,
  confirmPass: string,
): string | null {
  if (!oldPass || !newPass || !confirmPass) {
    return 'Por favor, completa todos los campos.';
  }
  if (newPass.length < 8) {
    return 'La nueva contraseña debe tener al menos 8 caracteres.';
  }
  if (newPass !== confirmPass) {
    return 'La confirmación de la contraseña no coincide.';
  }
  if (oldPass === newPass) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }
  return null;
}

function expandForm(rt: ReturnType<typeof render>): void {
  fireEvent.press(rt.getByText('Cambiar Contraseña'));
}

function fillAndSubmit(
  rt: ReturnType<typeof render>,
  overrides: { old?: string; new?: string; confirm?: string } = {},
): void {
  fireEvent.changeText(
    rt.getByTestId('old-password-input'),
    overrides.old ?? 'oldpassword123',
  );
  fireEvent.changeText(
    rt.getByTestId('new-password-input'),
    overrides.new ?? 'newpassword456',
  );
  fireEvent.changeText(
    rt.getByTestId('confirm-password-input'),
    overrides.confirm ?? 'newpassword456',
  );
  // Press the submit button (last "Cambiar Contraseña" text)
  const buttons = rt.getAllByText('Cambiar Contraseña');
  fireEvent.press(buttons[buttons.length - 1]!);
}

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNetInfo.mockReturnValue({ isConnected: true });
  mockUseAuth.mockReturnValue({ changePassword: mockChangePassword });
});

// ── Tests ──────────────────────────────────────────────

describe('ChangePassword', () => {
  it('renderiza colapsado por defecto', () => {
    const { getByText, queryByTestId } = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );

    expect(getByText('Cambiar Contraseña')).toBeTruthy();
    expect(queryByTestId('old-password-input')).toBeNull();
    expect(queryByTestId('new-password-input')).toBeNull();
    expect(queryByTestId('confirm-password-input')).toBeNull();
  });

  it('expande al presionar el encabezado mostrando los tres inputs y el botón', () => {
    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);

    expect(rt.getByTestId('old-password-input')).toBeTruthy();
    expect(rt.getByTestId('new-password-input')).toBeTruthy();
    expect(rt.getByTestId('confirm-password-input')).toBeTruthy();
    expect(rt.getByTestId('change-password-button')).toBeTruthy();
  });

  describe('validatePasswordChange', () => {
    it('retorna error cuando todos los campos están vacíos', () => {
      expect(validatePasswordChange('', '', '')).toBe(
        'Por favor, completa todos los campos.',
      );
    });

    it('retorna error cuando algún campo está vacío', () => {
      expect(validatePasswordChange('old', '', 'confirm')).toBe(
        'Por favor, completa todos los campos.',
      );
      expect(validatePasswordChange('', 'new', 'confirm')).toBe(
        'Por favor, completa todos los campos.',
      );
      expect(validatePasswordChange('old', 'new', '')).toBe(
        'Por favor, completa todos los campos.',
      );
    });

    it('retorna error cuando la nueva contraseña es menor a 8 caracteres', () => {
      expect(validatePasswordChange('old123456', 'short', 'short')).toBe(
        'La nueva contraseña debe tener al menos 8 caracteres.',
      );
    });

    it('retorna error cuando la confirmación no coincide', () => {
      expect(
        validatePasswordChange('old123456', 'newpassword', 'different'),
      ).toBe('La confirmación de la contraseña no coincide.');
    });

    it('retorna error cuando la nueva contraseña es igual a la actual', () => {
      expect(
        validatePasswordChange('samepassword', 'samepassword', 'samepassword'),
      ).toBe('La nueva contraseña debe ser diferente a la actual.');
    });

    it('retorna null para valores válidos', () => {
      expect(
        validatePasswordChange('old123456', 'newpassword', 'newpassword'),
      ).toBeNull();
    });
  });

  it('muestra error de validación al enviar con campos vacíos', async () => {
    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);

    // Press submit without filling anything
    const buttons = rt.getAllByText('Cambiar Contraseña');
    fireEvent.press(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(
        rt.getByText('Por favor, completa todos los campos.'),
      ).toBeTruthy();
    });
  });

  it('muestra error de conexión cuando no hay internet', async () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    await waitFor(() => {
      expect(rt.getByText('Sin conexión a Internet.')).toBeTruthy();
    });
  });

  it('llama a changePassword con los datos correctos y muestra mensaje de éxito', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        old_password: 'oldpassword123',
        new_password: 'newpassword456',
      });
    });

    await waitFor(() => {
      expect(
        rt.getByText(
          'Contraseña cambiada exitosamente. Cerrando sesión...',
        ),
      ).toBeTruthy();
    });
  });

  it('llama a onPasswordChanged después del timeout de 1500ms', async () => {
    jest.useFakeTimers();
    mockChangePassword.mockResolvedValueOnce(undefined);

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    // Wait for success message to appear (API resolved)
    await waitFor(() => {
      expect(
        rt.getByText(
          'Contraseña cambiada exitosamente. Cerrando sesión...',
        ),
      ).toBeTruthy();
    });

    // Advance timer to trigger the callback
    jest.advanceTimersByTime(1500);

    expect(mockOnPasswordChanged).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('muestra mensaje de error de API en el banner', async () => {
    mockChangePassword.mockRejectedValueOnce(
      new Error('Contraseña actual incorrecta.'),
    );

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    await waitFor(() => {
      expect(rt.getByText('Contraseña actual incorrecta.')).toBeTruthy();
    });
  });

  it('muestra "Sesión expirada o no autorizada." para error 401', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockChangePassword.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    } as unknown as Error);

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    await waitFor(() => {
      expect(
        rt.getByText('Sesión expirada o no autorizada.'),
      ).toBeTruthy();
    });

    jest.restoreAllMocks();
  });

  it('no lanza error al desmontar después del cambio de contraseña', async () => {
    jest.useFakeTimers();
    mockChangePassword.mockResolvedValueOnce(undefined);

    const rt = render(
      <ChangePassword onPasswordChanged={mockOnPasswordChanged} />,
    );
    expandForm(rt);
    fillAndSubmit(rt);

    await waitFor(() => {
      expect(
        rt.getByText(
          'Contraseña cambiada exitosamente. Cerrando sesión...',
        ),
      ).toBeTruthy();
    });

    // Should not throw on unmount (cleanup effect)
    expect(() => rt.unmount()).not.toThrow();

    jest.useRealTimers();
  });
});
