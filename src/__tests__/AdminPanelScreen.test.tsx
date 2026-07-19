/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import '@testing-library/jest-native/extend-expect';
import { render } from '@testing-library/react-native';

import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
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

describe('AdminPanelScreen', () => {
  const renderScreen = () =>
    render(<AdminPanelScreen navigation={mockNavigation} />);

  it('renderiza el titulo Panel', () => {
    const { getByText } = renderScreen();
    expect(getByText('Panel')).toBeTruthy();
  });

  it('renderiza las tarjetas de estadisticas', () => {
    const { getByText } = renderScreen();
    expect(getByText('Productos')).toBeTruthy();
    expect(getByText('Usuarios')).toBeTruthy();
    expect(getByText('Pedidos')).toBeTruthy();
  });

  it('renderiza la fecha actual', () => {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const d = new Date();
    const today = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;

    const { getByText } = renderScreen();
    expect(getByText(today)).toBeTruthy();
  });
});
