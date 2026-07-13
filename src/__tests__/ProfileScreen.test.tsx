/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any -- Test files are less strict */
import React from 'react';

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/screens/common/ProfileScreen';

const mockUpdateProfile = jest.fn();
const mockChangePassword = jest.fn();
const mockLogout = jest.fn();

const mockUser = {
  id: 1,
  id_usuario: 1,
  email: 'perfil@test.com',
  telefono: '1234567890',
  role: 'buyer',
  nombre: 'María',
  apellido_paterno: 'González',
  apellido_materno: 'López',
  fecha_nacimiento: '1990-08-20',
  genero: 'F',
  direccion: 'Av. Siempre Viva 742',
  localidad: 5,
  localidad_nombre: 'Centro Tepic',
};

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
    logout: mockLogout,
  }),
}));

const mockNetInfoState = { isConnected: true };
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ ...mockNetInfoState })),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockSetLocalidadId = jest.fn();
const mockSetLocalidadNombre = jest.fn();
const mockSetSelectedMunicipioId = jest.fn();
const mockSetSelectedMunicipioNombre = jest.fn();
const mockHandleSelectMunicipio = jest.fn();
const mockHandleSelectLocalidad = jest.fn();
const mockRefetchMunicipios = jest.fn();
const mockRefetchLocalidades = jest.fn();

const mockUseCatalogs = {
  municipios: [] as any[],
  localidades: [] as any[],
  selectedMunicipioId: null as number | null,
  selectedMunicipioNombre: '',
  localidadId: null as number | null,
  localidadNombre: '',
  isLoadingMunicipios: false,
  isLoadingLocalidades: false,
  errorMunicipios: null as string | null,
  errorLocalidades: null as string | null,
  refetchMunicipios: mockRefetchMunicipios,
  refetchLocalidades: mockRefetchLocalidades,
  handleSelectMunicipio: mockHandleSelectMunicipio,
  handleSelectLocalidad: mockHandleSelectLocalidad,
  setSelectedMunicipioId: mockSetSelectedMunicipioId,
  setSelectedMunicipioNombre: mockSetSelectedMunicipioNombre,
  setLocalidadId: mockSetLocalidadId,
  setLocalidadNombre: mockSetLocalidadNombre,
};

jest.mock('@/hooks/useCatalogs', () => ({
  useCatalogs: () => mockUseCatalogs,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoState.isConnected = true;

    // Reset default mock catalog states
    mockUseCatalogs.municipios = [{ id_municipio: 1, nombre: 'Tepic' }];
    mockUseCatalogs.localidades = [
      { id_localidad: 5, nombre: 'Centro Tepic', municipio_id: 1 },
    ];
    mockUseCatalogs.selectedMunicipioId = null;
    mockUseCatalogs.selectedMunicipioNombre = '';
    mockUseCatalogs.localidadId = 5;
    mockUseCatalogs.localidadNombre = 'Centro Tepic';
    mockUseCatalogs.isLoadingMunicipios = false;
    mockUseCatalogs.isLoadingLocalidades = false;
    mockUseCatalogs.errorMunicipios = null;
    mockUseCatalogs.errorLocalidades = null;
  });

  it('renderiza correctamente el perfil en modo vista', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('María González')).toBeTruthy();
    expect(getByText('perfil@test.com')).toBeTruthy();
    expect(getByText('Comprador')).toBeTruthy(); // getRoleLabel
    expect(getByText('Av. Siempre Viva 742')).toBeTruthy();
    expect(getByText('Centro Tepic')).toBeTruthy();
  });

  it('permite cambiar a pestaña de edición y actualizar datos exitosamente', async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <ProfileScreen />,
    );

    // Cambiar a tab Editar
    fireEvent.press(getByText('Editar'));

    expect(getByPlaceholderText('Nombre')).toBeTruthy();

    // Modificamos el nombre
    fireEvent.changeText(getByPlaceholderText('Nombre'), 'María José');
    fireEvent.press(getByTestId('save-changes-button'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        nombre: 'María José',
        apellido_paterno: 'González',
        apellido_materno: 'López',
        telefono: '1234567890',
        fecha_nacimiento: '1990-08-20',
        sexo: 'F',
        domicilio: 'Av. Siempre Viva 742',
        fk_localidad: 5,
      });
      expect(getByText('Perfil actualizado exitosamente.')).toBeTruthy();
    });
  });

  it('muestra mensaje de error si la edición de perfil falla en la API', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('API Error'));
    const { getByText, getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByText('Editar'));
    expect(getByTestId('save-changes-button')).toBeTruthy();

    fireEvent.press(getByTestId('save-changes-button'));

    await waitFor(() => {
      expect(getByText('API Error')).toBeTruthy();
    });
  });

  it('pestaña seguridad: valida contraseñas y realiza el cambio y deslogueo con timer', async () => {
    jest.useFakeTimers();
    mockChangePassword.mockResolvedValueOnce(undefined);
    mockLogout.mockResolvedValueOnce(undefined);

    const { getByText, getByTestId } = render(<ProfileScreen />);

    // Cambiar a tab Seguridad
    fireEvent.press(getByText('Seguridad'));

    expect(getByTestId('old-password-input')).toBeTruthy();

    // Validar contraseña demasiado corta
    fireEvent.changeText(getByTestId('old-password-input'), 'oldpwd');
    fireEvent.changeText(getByTestId('new-password-input'), '123'); // Corta
    fireEvent.changeText(getByTestId('confirm-password-input'), '123');

    fireEvent.press(getByTestId('change-password-button'));

    await waitFor(() => {
      expect(
        getByText('La nueva contraseña debe tener al menos 6 caracteres.'),
      ).toBeTruthy();
    });

    // Validar que no coinciden
    fireEvent.changeText(getByTestId('new-password-input'), 'newpwd123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'mismatch');

    fireEvent.press(getByTestId('change-password-button'));

    await waitFor(() => {
      expect(
        getByText('La confirmación de la contraseña no coincide.'),
      ).toBeTruthy();
    });

    // Enviar cambio exitoso
    fireEvent.changeText(getByTestId('confirm-password-input'), 'newpwd123');
    fireEvent.press(getByTestId('change-password-button'));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        old_password: 'oldpwd',
        new_password: 'newpwd123',
      });
      expect(
        getByText('Contraseña cambiada exitosamente. Cerrando sesión...'),
      ).toBeTruthy();
    });

    // Fast-forward timers
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockLogout).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
