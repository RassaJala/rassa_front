/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import '@testing-library/jest-native/extend-expect';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useCatalogs } from '@/hooks/useCatalogs';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import api from '@/services/api';
import type { AdminStackParamList } from '@/types';

const mockNavigate = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getState: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  navigateDeprecated: jest.fn(),
  preload: jest.fn(),
} as unknown as NativeStackNavigationProp<AdminStackParamList, 'AdminPanel'>;

jest.mock('@/hooks/useCatalogs');
jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id_usuario: 1, nombre: 'Admin', role: 'admin' },
  }),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

const mockUseCatalogs = useCatalogs as jest.Mock;
const mockApiPost = api.post as jest.Mock;
const mockApiPatch = api.patch as jest.Mock;

const mockCatalog = {
  municipios: [{ id_municipio: 1, nombre: 'Municipio 1' }],
  localidades: [{ id_localidad: 1, nombre: 'Localidad 1', municipio_id: 1 }],
  selectedMunicipioId: 1,
  selectedMunicipioNombre: 'Municipio 1',
  localidadId: 1,
  localidadNombre: 'Localidad 1',
  isLoadingMunicipios: false,
  isLoadingLocalidades: false,
  errorMunicipios: null,
  errorLocalidades: null,
  refetchMunicipios: jest.fn(),
  refetchLocalidades: jest.fn(),
  handleSelectMunicipio: jest.fn((id, nombre) => {
    mockCatalog.selectedMunicipioId = id;
    mockCatalog.selectedMunicipioNombre = nombre;
  }),
  handleSelectLocalidad: jest.fn((id, nombre) => {
    mockCatalog.localidadId = id;
    mockCatalog.localidadNombre = nombre;
  }),
  setSelectedMunicipioId: jest.fn(),
  setSelectedMunicipioNombre: jest.fn(),
  setLocalidadId: jest.fn(),
  setLocalidadNombre: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCatalogs.mockReturnValue(mockCatalog);
  mockApiPost.mockResolvedValue({ data: { data: { id_usuario: 1 } } });
  mockApiPatch.mockResolvedValue({ data: { data: { id_usuario: 1 } } });
});

describe('AdminPanelScreen', () => {
  const renderScreen = () =>
    render(<AdminPanelScreen navigation={mockNavigation} />);

  it('renders initial state with "Agregar usuario" button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Panel de Admin')).toBeTruthy();
    expect(getByText('Agregar usuario')).toBeTruthy();
  });

  it('shows form when "Agregar usuario" is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    expect(getByText('Registrar Usuario')).toBeTruthy();
    expect(getByText('Rol del usuario')).toBeTruthy();
  });

  it('toggles role selection', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.press(getByText('Vendedor'));
    expect(getByText('Vendedor')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(
        getByText('Por favor, completa todos los campos obligatorios.'),
      ).toBeTruthy();
    });
  });

  it('validates email format', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'invalid-email',
    );
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    });
  });

  it('validates password length', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123');
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(
        getByText('La contraseña debe tener al menos 6 caracteres.'),
      ).toBeTruthy();
    });
  });

  it('validates phone number length', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '5551234');
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(
        getByText(
          'El teléfono debe tener 10 dígitos (nacional) o 12 dígitos (internacional).',
        ),
      ).toBeTruthy();
    });
  });

  it('validates date format', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '555-123-45-67');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), 'invalid-date');
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(
        getByText('La fecha de nacimiento debe tener el formato AAAA-MM-DD.'),
      ).toBeTruthy();
    });
  });

  it('validates age >= 18 years', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    const today = new Date();
    const recentDate = `${today.getFullYear() - 17}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '555-123-45-67');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), recentDate);
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(getByText('El usuario debe ser mayor de 18 años.')).toBeTruthy();
    });
  });

  it('submits successfully and shows success message', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    const today = new Date();
    const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '555-123-45-67');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'AdminName');
    fireEvent.changeText(
      getByPlaceholderText('Apellido Paterno'),
      'AdminLastName',
    );
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle 123',
    );
    fireEvent.press(getByText('Agregar usuario'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/auth/register/',
        expect.objectContaining({
          email: 'test@example.com',
          role: 'farmer',
        }),
      );
    });

    await waitFor(() => {
      expect(
        getByText('Usuario (Agricultor) registrado exitosamente.'),
      ).toBeTruthy();
    });
  });

  it('shows error message on API failure', async () => {
    mockApiPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Email ya registrado' } },
    });

    const { getByText, getByPlaceholderText } = renderScreen();
    const today = new Date();
    const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '555-123-45-67');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'AdminName');
    fireEvent.changeText(
      getByPlaceholderText('Apellido Paterno'),
      'AdminLastName',
    );
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle 123',
    );
    fireEvent.press(getByText('Agregar usuario'));

    await waitFor(() => {
      expect(getByText('Email ya registrado')).toBeTruthy();
    });
  });

  it('prevents double submission with isSubmitting flag', async () => {
    mockApiPost.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { data: {} } }), 100),
        ),
    );

    const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
    const today = new Date();
    const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '555-123-45-67');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'AdminName');
    fireEvent.changeText(
      getByPlaceholderText('Apellido Paterno'),
      'AdminLastName',
    );
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle 123',
    );

    const submitBtn = getByTestId('button');
    fireEvent.press(submitBtn);
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });
  });
});
