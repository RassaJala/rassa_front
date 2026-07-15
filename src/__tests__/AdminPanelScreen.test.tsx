/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useCatalogs } from '@/hooks/useCatalogs';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import api from '@/services/api';

jest.mock('@/hooks/useCatalogs');
jest.mock('@/services/api');
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

const mockUseCatalogs = useCatalogs as jest.Mock;
const mockApiPost = api.post as jest.Mock;
const mockApiPatch = api.patch as jest.Mock;

const mockCatalog = {
  municipios: [{ id_municipio: 1, nombre: 'Municipio 1' }],
  localidades: [{ id_localidad: 1, nombre: 'Localidad 1', municipio_id: 1 }],
  selectedMunicipioId: null,
  selectedMunicipioNombre: '',
  localidadId: null,
  localidadNombre: '',
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
  const renderScreen = () => render(<AdminPanelScreen />);

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
    fireEvent.changeText(getByPlaceholderText('xxx-xxx-xx-xx'), '5551234');
    fireEvent.press(getByText('Agregar usuario'));
    await waitFor(() => {
      expect(
        getByText('El teléfono debe tener exactamente 10 dígitos.'),
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
    fireEvent.changeText(
      getByPlaceholderText('xxx-xxx-xx-xx'),
      '555-123-45-67',
    );
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
    fireEvent.changeText(
      getByPlaceholderText('xxx-xxx-xx-xx'),
      '555-123-45-67',
    );
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
    fireEvent.changeText(
      getByPlaceholderText('xxx-xxx-xx-xx'),
      '555-123-45-67',
    );
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);
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
    fireEvent.changeText(
      getByPlaceholderText('xxx-xxx-xx-xx'),
      '555-123-45-67',
    );
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);
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

    const { getByText, getByPlaceholderText } = renderScreen();
    const today = new Date();
    const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@example.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.changeText(
      getByPlaceholderText('xxx-xxx-xx-xx'),
      '555-123-45-67',
    );
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), eighteenYearsAgo);

    fireEvent.press(getByText('Agregar usuario'));
    fireEvent.press(getByText('Agregar usuario'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });
  });
});
