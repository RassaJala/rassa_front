/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RegisterScreen from '@/screens/auth/RegisterScreen';

const mockRegister = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
}));

const mockNetInfoState = { isConnected: true };
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ ...mockNetInfoState })),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoState.isConnected = true;

    // Reset default mock catalog states to a VALID state
    mockUseCatalogs.municipios = [
      { id_municipio: 1, nombre: 'Tepic' },
      { id_municipio: 2, nombre: 'Xalisco' },
    ];
    mockUseCatalogs.localidades = [
      { id_localidad: 10, nombre: 'La Cantera', municipio_id: 1 },
      { id_localidad: 11, nombre: 'Mora', municipio_id: 1 },
    ];
    mockUseCatalogs.selectedMunicipioId = 1;
    mockUseCatalogs.selectedMunicipioNombre = 'Tepic';
    mockUseCatalogs.localidadId = 10;
    mockUseCatalogs.localidadNombre = 'La Cantera';
    mockUseCatalogs.isLoadingMunicipios = false;
    mockUseCatalogs.isLoadingLocalidades = false;
    mockUseCatalogs.errorMunicipios = null;
    mockUseCatalogs.errorLocalidades = null;
  });

  const renderScreen = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <RegisterScreen />
      </QueryClientProvider>,
    );
  };

  it('renderiza correctamente todos los campos obligatorios', () => {
    const { getByPlaceholderText, getByText } = renderScreen();

    expect(getByPlaceholderText('ejemplo@correo.com')).toBeTruthy();
    expect(getByPlaceholderText('Nombre(s)')).toBeTruthy();
    expect(getByPlaceholderText('Apellido Paterno')).toBeTruthy();
    expect(getByPlaceholderText('10 dígitos')).toBeTruthy();
    expect(getByPlaceholderText('AAAA-MM-DD')).toBeTruthy();
    expect(getByText('Tepic')).toBeTruthy();
    expect(getByText('La Cantera')).toBeTruthy();
  });

  it('valida campos vacíos obligatorios', () => {
    mockUseCatalogs.localidadId = null; // Forzar error de campo obligatorio
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Registrarse'));

    expect(
      getByText('Por favor, completa todos los campos obligatorios.'),
    ).toBeTruthy();
  });

  it('valida correo electrónico incorrecto', () => {
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'correo-invalido',
    );
    fireEvent.changeText(
      getByPlaceholderText('Mínimo 8 caracteres'),
      'password123',
    );
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'Juan');
    fireEvent.changeText(getByPlaceholderText('Apellido Paterno'), 'Pérez');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '1234567890');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), '1990-05-15');
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle Falsa 123',
    );

    fireEvent.press(getByText('Registrarse'));

    expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
  });

  it('valida longitud de contraseña corta', () => {
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'juan@test.com',
    );
    fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), '123'); // Corta
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'Juan');
    fireEvent.changeText(getByPlaceholderText('Apellido Paterno'), 'Pérez');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '1234567890');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), '1990-05-15');
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle Falsa 123',
    );

    fireEvent.press(getByText('Registrarse'));

    expect(
      getByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeTruthy();
  });

  it('valida formato de fecha de nacimiento incorrecto', () => {
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'juan@test.com',
    );
    fireEvent.changeText(
      getByPlaceholderText('Mínimo 8 caracteres'),
      'password123',
    );
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'Juan');
    fireEvent.changeText(getByPlaceholderText('Apellido Paterno'), 'Pérez');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '1234567890');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), '15-05-1990'); // Incorrecto
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle Falsa 123',
    );

    fireEvent.press(getByText('Registrarse'));

    expect(
      getByText('La fecha de nacimiento debe tener el formato AAAA-MM-DD.'),
    ).toBeTruthy();
  });

  it('muestra error cuando no hay conexión de red', () => {
    mockNetInfoState.isConnected = false;
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Registrarse'));

    expect(getByText('Sin conexión a Internet.')).toBeTruthy();
  });

  it('ejecuta registro exitosamente si los datos son correctos y localidad está seleccionada', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com'),
      'test@reg.com',
    );
    fireEvent.changeText(
      getByPlaceholderText('Mínimo 8 caracteres'),
      'password123',
    );
    fireEvent.changeText(getByPlaceholderText('Nombre(s)'), 'NombreTest');
    fireEvent.changeText(
      getByPlaceholderText('Apellido Paterno'),
      'PaternoTest',
    );
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '1234567890');
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), '1995-10-10');
    fireEvent.changeText(
      getByPlaceholderText('Calle, número, colonia'),
      'Calle 123',
    );

    fireEvent.press(getByText('Registrarse'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@reg.com',
        password: 'password123',
        telefono: '1234567890',
        role: 'buyer',
        nombre: 'NombreTest',
        apellido_paterno: 'PaternoTest',
        apellido_materno: null,
        fecha_nacimiento: '1995-10-10',
        sexo: 'M',
        domicilio: 'Calle 123',
        fk_localidad: 10,
      });
    });
  });

  it('muestra error de reintento si falla la carga de municipios', () => {
    mockUseCatalogs.errorMunicipios = 'API Error';
    mockUseCatalogs.selectedMunicipioNombre = ''; // force showing error view instead of selected
    const { getByText } = renderScreen();

    expect(getByText('Error al cargar municipios')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();

    fireEvent.press(getByText('Reintentar'));
    expect(mockRefetchMunicipios).toHaveBeenCalled();
  });
});
