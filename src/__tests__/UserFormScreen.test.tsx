/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any -- Test mocks */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import UserFormScreen from '@/screens/admin/UserFormScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
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
jest.mock('@/hooks/useSubmitNewUser', () => ({
  useSubmitNewUser: () => ({
    submit: mockSubmit,
    isSubmitting: false,
    errorMessage: null,
    serverError: '',
    setErrorMessage: jest.fn(),
    setServerError: jest.fn(),
  }),
}));

describe('UserFormScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders title and role selection', () => {
    const { getByText } = renderScreen();
    expect(getByText('Nuevo usuario')).toBeTruthy();
    expect(getByText('Cliente')).toBeTruthy();
    expect(getByText('Vendedor')).toBeTruthy();
    expect(getByText('Agricultor')).toBeTruthy();
  });

  it('navigates back when clicking back button or cancel', () => {
    const { getByText } = renderScreen();
    const cancelButton = getByText('Cancelar');
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('submits form when clicking save', () => {
    const { getByText } = renderScreen();
    const saveButton = getByText('Guardar');
    fireEvent.press(saveButton);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
