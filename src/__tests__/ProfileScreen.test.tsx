/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import '@testing-library/jest-native/extend-expect';
import { useNetInfo } from '@react-native-community/netinfo';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import axios from 'axios';

import { useCatalogs } from '@/hooks/useCatalogs';
import ProfileScreen from '@/screens/common/ProfileScreen';
import { useAuth } from '@/store/AuthContext';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
  fetch: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));
jest.mock('@/store/AuthContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  const actual = jest.requireActual('@/store/AuthContext');
  return {
    ...(actual as Record<string, unknown>),
    useAuth: jest.fn(),
  };
});
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
}));
jest.mock('@/hooks/useCatalogs');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseNetInfo = useNetInfo as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseCatalogs = useCatalogs as jest.Mock;

const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'test@example.com',
  id_usuario: 1,
  telefono: '5551234567',
  role: 'buyer',
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: 'García',
  fecha_nacimiento: '1990-01-15',
  genero: 'M',
  direccion: 'Calle 123, Col. Centro',
  localidad: 1,
  localidad_nombre: 'Localidad 1',
};

const mockCatalog = {
  selectedMunicipioId: 1,
  selectedMunicipioNombre: 'Municipio 1',
  localidadId: 1,
  localidadNombre: 'Localidad 1',
  municipios: [{ id_municipio: 1, nombre: 'Municipio 1' }],
  localidades: [{ id_localidad: 1, nombre: 'Localidad 1', municipio_id: 1 }],
  isLoadingMunicipios: false,
  isLoadingLocalidades: false,
  errorMunicipios: null,
  errorLocalidades: null,
  refetchMunicipios: jest.fn(),
  refetchLocalidades: jest.fn(),
  handleSelectMunicipio: jest.fn(),
  handleSelectLocalidad: jest.fn(),
  setLocalidadId: jest.fn(),
  setLocalidadNombre: jest.fn(),
  setSelectedMunicipioId: jest.fn(),
  setSelectedMunicipioNombre: jest.fn(),
};

const mockAuth = {
  user: mockUser,
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  logout: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNetInfo.mockReturnValue({ isConnected: true });
  mockUseAuth.mockReturnValue(mockAuth);
  mockUseCatalogs.mockReturnValue(mockCatalog);
});

describe('ProfileScreen', () => {
  it('renders profile header with user info in view mode', () => {
    const { getByText, getAllByText } = render(<ProfileScreen />);
    expect(getByText('Juan Pérez')).toBeTruthy();
    expect(getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Comprador')).toBeTruthy();
  });

  it('renders "Mi Perfil" title in view mode', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Mi Perfil')).toBeTruthy();
  });

  describe('edit mode', () => {
    function renderAndEdit(): ReturnType<typeof render> {
      const rt = render(<ProfileScreen />);
      fireEvent.press(rt.getByTestId('edit-profile-button'));
      return rt;
    }

    it('switches to edit mode showing edit form fields', () => {
      const { getByPlaceholderText } = renderAndEdit();
      expect(getByPlaceholderText('Nombre')).toBeTruthy();
      expect(getByPlaceholderText('Apellido Paterno')).toBeTruthy();
    });

    it('validates required fields on save', async () => {
      const { getByText, getByPlaceholderText } = renderAndEdit();
      fireEvent.changeText(getByPlaceholderText('Nombre'), '');
      fireEvent.press(getByText('Guardar'));
      await waitFor(() => {
        expect(getByText('Por favor, completa todos los campos obligatorios.')).toBeTruthy();
      });
    });

    it('validates phone length', async () => {
      const { getByText, getByPlaceholderText } = renderAndEdit();
      fireEvent.changeText(getByPlaceholderText('xxx-xxx-xx-xx'), '555');
      fireEvent.press(getByText('Guardar'));
      await waitFor(() => {
        expect(
          getByText('El teléfono debe tener exactamente 10 dígitos.'),
        ).toBeTruthy();
      });
    });

    it('shows success message after saving', async () => {
      mockAuth.updateProfile.mockResolvedValueOnce(undefined);
      const { getByText } = renderAndEdit();
      // User data is pre-populated with valid fields — just save
      fireEvent.press(getByText('Guardar'));
      await waitFor(() => {
        expect(getByText('Perfil actualizado exitosamente.')).toBeTruthy();
      });
    });

    it('shows error on API failure', async () => {
      mockAuth.updateProfile.mockRejectedValueOnce(
        new Error('Error al actualizar perfil.'),
      );
      const { getByText } = renderAndEdit();
      fireEvent.press(getByText('Guardar'));
      await waitFor(() => {
        expect(getByText('Error al actualizar perfil.')).toBeTruthy();
      });
    });
  });

  describe('password change', () => {
    function renderAndExpand(): ReturnType<typeof render> {
      const rt = render(<ProfileScreen />);
      fireEvent.press(rt.getByText('Cambiar Contraseña'));
      return rt;
    }

    it('shows password change form with testIDs after expanding', () => {
      const { getByTestId } = renderAndExpand();
      expect(getByTestId('old-password-input')).toBeTruthy();
      expect(getByTestId('new-password-input')).toBeTruthy();
      expect(getByTestId('confirm-password-input')).toBeTruthy();
    });

    /** Press the submit button (second "Cambiar Contraseña" text is the button) */
    function pressChangePassword(rt: ReturnType<typeof render>): void {
      const buttons = rt.getAllByText('Cambiar Contraseña');
      fireEvent.press(buttons[buttons.length - 1]!);
    }

    it('validates all fields required', async () => {
      const rt = renderAndExpand();
      pressChangePassword(rt);
      await waitFor(() => {
        expect(rt.getByText('Por favor, completa todos los campos.')).toBeTruthy();
      });
    });

    it('validates new password length', async () => {
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'oldpass');
      fireEvent.changeText(rt.getByTestId('new-password-input'), '123');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), '123');
      pressChangePassword(rt);
      await waitFor(() => {
        expect(
          rt.getByText('La nueva contraseña debe tener al menos 8 caracteres.'),
        ).toBeTruthy();
      });
    });

    it('validates password confirmation matches', async () => {
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'oldpassword');
      fireEvent.changeText(rt.getByTestId('new-password-input'), 'newpassword1');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), 'different');
      pressChangePassword(rt);
      await waitFor(() => {
        expect(
          rt.getByText('La confirmación de la contraseña no coincide.'),
        ).toBeTruthy();
      });
    });

    it('validates new password different from old', async () => {
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'samepassword');
      fireEvent.changeText(rt.getByTestId('new-password-input'), 'samepassword');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), 'samepassword');
      pressChangePassword(rt);
      await waitFor(() => {
        expect(
          rt.getByText('La nueva contraseña debe ser diferente a la actual.'),
        ).toBeTruthy();
      });
    });

    it('calls logout on successful password change', async () => {
      jest.useFakeTimers();
      mockAuth.changePassword.mockResolvedValueOnce(undefined);
      mockAuth.logout.mockResolvedValueOnce(undefined);
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'oldpassword');
      fireEvent.changeText(rt.getByTestId('new-password-input'), 'newpassword1');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), 'newpassword1');
      pressChangePassword(rt);

      // Success message visible before timer fires
      await waitFor(() => {
        expect(
          rt.getByText('Contraseña cambiada exitosamente. Cerrando sesión...'),
        ).toBeTruthy();
      });

      // Advance timer to trigger logout callback
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockAuth.logout).toHaveBeenCalled();
      });
      jest.useRealTimers();
    });

    it('shows error on API failure', async () => {
      mockAuth.changePassword.mockRejectedValueOnce(
        new Error('Contraseña actual incorrecta.'),
      );
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'oldpassword');
      fireEvent.changeText(rt.getByTestId('new-password-input'), 'newpassword1');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), 'newpassword1');
      pressChangePassword(rt);
      await waitFor(() => {
        expect(rt.getByText('Contraseña actual incorrecta.')).toBeTruthy();
      });
    });

    it('shows 401 error for wrong old password', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockAuth.changePassword.mockRejectedValueOnce({
        response: { status: 401, data: {} },
      } as unknown as Error);
      const rt = renderAndExpand();
      fireEvent.changeText(rt.getByTestId('old-password-input'), 'wrongpassword');
      fireEvent.changeText(rt.getByTestId('new-password-input'), 'newpassword1');
      fireEvent.changeText(rt.getByTestId('confirm-password-input'), 'newpassword1');
      pressChangePassword(rt);
      await waitFor(() => {
        expect(rt.getByText('Sesión expirada o no autorizada.')).toBeTruthy();
      });
      jest.restoreAllMocks();
    });
  });

  describe('offline handling', () => {
    it('shows offline error when changing password without connection', async () => {
      mockUseNetInfo.mockReturnValue({ isConnected: false });
      const rt = render(<ProfileScreen />);
      // Expand password section
      fireEvent.press(rt.getByText('Cambiar Contraseña'));
      // Press submit button (second "Cambiar Contraseña" text)
      const buttons = rt.getAllByText('Cambiar Contraseña');
      fireEvent.press(buttons[buttons.length - 1]!);
      await waitFor(() => {
        expect(rt.getByText('Sin conexión a Internet.')).toBeTruthy();
      });
    });
  });

  describe('user null handling', () => {
    it('renders without crashing when user is null', () => {
      mockUseAuth.mockReturnValueOnce({ ...mockAuth, user: null });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Mi Perfil')).toBeTruthy();
    });
  });
});
