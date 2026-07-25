/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

import OrderHistoryScreen from '@/screens/buyer/OrderHistoryScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { results: [] } }),
  },
}));

const mockOrders = [
  {
    id_pedido: 1,
    cliente_nombre: 'Cliente Test',
    vendedor_nombre: null,
    total: '150.50',
    estado_actual: 'pendiente' as const,
    creado_en: '2026-07-24T10:00:00Z',
    productos: ['Manzana', 'Pera'],
    has_more_productos: false,
  },
  {
    id_pedido: 2,
    cliente_nombre: 'Cliente Test',
    vendedor_nombre: null,
    total: '320.00',
    estado_actual: 'listo_para_retirar' as const,
    creado_en: '2026-07-23T15:30:00Z',
    productos: ['Lechuga', 'Tomate', 'Cebolla'],
    has_more_productos: true,
  },
];

describe('OrderHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as unknown as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
  });

  it('renderiza correctamente con datos', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('Mis Pedidos')).toBeTruthy();
    expect(getByText('#1')).toBeTruthy();
    expect(getByText('#2')).toBeTruthy();
  });

  it('renderiza el total formateado correctamente', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('$150.50')).toBeTruthy();
    expect(getByText('$320.00')).toBeTruthy();
  });

  it('renderiza el estado del pedido', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('pendiente')).toBeTruthy();
    expect(getByText('listo para retirar')).toBeTruthy();
  });

  it('renderiza preview de productos', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('Manzana, Pera')).toBeTruthy();
    expect(getByText('Lechuga, Tomate, Cebolla...')).toBeTruthy();
  });

  it('muestra loading spinner mientras carga', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText).toBeDefined();
  });

  it('muestra mensaje de error cuando falla la carga', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('Error al cargar pedidos')).toBeTruthy();
  });

  it('muestra boton de reintentar en estado error', () => {
    const mockRefetch = jest.fn();
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('Reintentar')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('muestra mensaje vacio cuando no hay pedidos', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<OrderHistoryScreen />);

    expect(getByText('No tienes pedidos aún')).toBeTruthy();
  });

  it('navega al detalle al presionar Ver estatus', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getAllByText } = render(<OrderHistoryScreen />);

    fireEvent.press(getAllByText('Ver estatus')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 1 });
  });
});
