/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any -- Test mocks */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import UserFormScreen from '@/screens/admin/UserFormScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
  }),
}));

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock('@/services/api', () => ({
  get: (...args: any[]) => mockApiGet(...args),
  post: (...args: any[]) => mockApiPost(...args),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
}));

jest.mock('@/hooks/useCatalogs', () => ({
  useCatalogs: () => ({
    municipios: [],
    localidades: [],
    selectedMunicipioId: 1,
    selectedMunicipioNombre: 'Municipio Test',
    localidadId: 10,
    localidadNombre: 'Localidad Test',
    isLoadingMunicipios: false,
    isLoadingLocalidades: false,
    errorMunicipios: null,
    errorLocalidades: null,
    refetchMunicipios: jest.fn(),
    refetchLocalidades: jest.fn(),
    handleSelectMunicipio: jest.fn(),
    handleSelectLocalidad: jest.fn(),
    setSelectedMunicipioId: jest.fn(),
    setSelectedMunicipioNombre: jest.fn(),
    setLocalidadId: jest.fn(),
    setLocalidadNombre: jest.fn(),
  }),
}));

const mockSubmit = jest.fn();
let mockErrorMessage: string | null = null;
let mockServerError = '';
let mockIsSubmitting = false;

jest.mock('@/hooks/useSubmitNewUser', () => ({
  useSubmitNewUser: () => ({
    submit: mockSubmit,
    isSubmitting: mockIsSubmitting,
    errorMessage: mockErrorMessage,
    serverError: mockServerError,
    setErrorMessage: jest.fn(),
    setServerError: jest.fn(),
  }),
}));

describe('UserFormScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockErrorMessage = null;
    mockServerError = '';
    mockIsSubmitting = false;
    mockApiGet.mockResolvedValue({ data: { data: { role: 'admin' } } });
    mockApiPost.mockResolvedValue({ data: {} });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderScreen() {
    return render(
      <QueryClientProvider client={queryClient}>
        <UserFormScreen />
      </QueryClientProvider>,
    );
  }

  it('renders title and role selection', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Nuevo usuario')).toBeTruthy();
      expect(getByText('Cliente')).toBeTruthy();
      expect(getByText('Vendedor')).toBeTruthy();
      expect(getByText('Agricultor')).toBeTruthy();
    });
  });

  it('navigates back when clicking back button or cancel', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Cancelar')).toBeTruthy();
    });
    const cancelButton = getByText('Cancelar');
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('submits form when clicking save', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Guardar')).toBeTruthy();
    });
    const saveButton = getByText('Guardar');
    fireEvent.press(saveButton);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('redirects back if auth check fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Auth failed'));
    renderScreen();
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('redirects back if user role is not admin', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { data: { role: 'buyer' } } });
    renderScreen();
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('allows selecting user roles', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Vendedor')).toBeTruthy();
    });
    fireEvent.press(getByText('Vendedor'));
    fireEvent.press(getByText('Guardar'));
    expect(mockSubmit).toHaveBeenCalled();
  });

  it('renders loading state initially during auth check', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('auth-loading')).toBeTruthy();
  });

  it('renders validation error message if useSubmitNewUser returns errorMessage', async () => {
    mockErrorMessage = 'Por favor, completa todos los campos obligatorios.';
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(
        getByText('Por favor, completa todos los campos obligatorios.'),
      ).toBeTruthy();
    });
  });

  it('renders server error message if useSubmitNewUser returns serverError', async () => {
    mockServerError = 'Error del servidor: Correo ya registrado';
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(
        getByText('Error del servidor: Correo ya registrado'),
      ).toBeTruthy();
    });
  });

  it('renders loading indicator when submitting', async () => {
    mockIsSubmitting = true;
    const { getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('submit-loading')).toBeTruthy();
    });
  });

  it('opens date picker modal when pressing birthdate field', async () => {
    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('birthdate-pressable')).toBeTruthy();
    });
    fireEvent.press(getByTestId('birthdate-pressable'));
    await waitFor(() => {
      expect(getByText('Fecha de Nacimiento')).toBeTruthy();
    });
  });
});
