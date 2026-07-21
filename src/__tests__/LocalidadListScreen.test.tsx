/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import '@testing-library/jest-native/extend-expect';
import { render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id_usuario: 1, nombre: 'Admin', role: 'admin' },
  }),
}));
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
    isLoaded: true,
  }),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: { data: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useQueryClient: jest.fn().mockReturnValue({
    invalidateQueries: jest.fn(),
  }),
}));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    patch: jest.fn().mockResolvedValue({ data: { data: {} } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
}));

import LocalidadListScreen from '@/screens/admin/LocalidadListScreen';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
} as unknown as NativeStackNavigationProp<AdminStackParamList, 'LocalidadList'>;

const mockRoute = {
  key: 'LocalidadList-test',
  name: 'LocalidadList' as const,
  params: { municipioId: 1, municipioNombre: 'Test Municipio' },
} as RouteProp<AdminStackParamList, 'LocalidadList'>;

describe('LocalidadListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('se importa correctamente', () => {
    expect(LocalidadListScreen).toBeDefined();
  });

  it('renderiza sin errores', () => {
    expect(() =>
      render(
        <LocalidadListScreen navigation={mockNavigation} route={mockRoute} />,
      ),
    ).not.toThrow();
  });

  it('renderiza el header con el nombre del municipio', () => {
    const { getByText } = render(
      <LocalidadListScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Localidades (Test Municipio)')).toBeTruthy();
  });

  it('renderiza el estado vacio con la descripcion del municipio', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText } = render(
      <LocalidadListScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('No hay localidades')).toBeTruthy();
    expect(
      getByText('Agrega una localidad en Test Municipio para comenzar.'),
    ).toBeTruthy();
  });
});
