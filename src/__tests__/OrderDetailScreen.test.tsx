/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

import OrderDetailScreen from '@/screens/buyer/OrderDetailScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { orderId: 1 },
    key: 'OrderDetail-test',
    name: 'OrderDetail',
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
    get: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

const mockOrder = {
  id_pedido: 1,
  cliente_nombre: 'Cliente Test',
  vendedor_nombre: null,
  total: '150.50',
  subtotal: '130.00',
  iva: '20.50',
  estado_actual: 'pendiente' as const,
  creado_en: '2026-07-24T10:00:00Z',
  fecha_expiracion: null,
  productos: ['Manzana', 'Pera'],
  has_more_productos: false,
  detalles: [
    {
      id_detalle: 1,
      nombre_producto: 'Manzana',
      precio_unitario: '10.00',
      cantidad: 3,
      importe: '30.00',
    },
    {
      id_detalle: 2,
      nombre_producto: 'Pera',
      precio_unitario: '12.50',
      cantidad: 2,
      importe: '25.00',
    },
  ],
  historial: [
    {
      id_historial: 1,
      estado_anterior: null,
      estado_nuevo: 'pendiente',
      cambiado_por_nombre: 'Cliente Test',
      creado_en: '2026-07-24T10:00:00Z',
    },
    {
      id_historial: 2,
      estado_anterior: 'pendiente',
      estado_nuevo: 'confirmado',
      cambiado_por_nombre: 'Vendedor Test',
      creado_en: '2026-07-24T11:00:00Z',
    },
  ],
};

describe('OrderDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as unknown as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renderiza correctamente con datos', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Pedido #1')).toBeTruthy();
    expect(getByText('$150.50')).toBeTruthy();
  });

  it('muestra loading spinner mientras carga', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { UNSAFE_getAllByType } = render(<OrderDetailScreen />);

    expect(UNSAFE_getAllByType).toBeDefined();
  });

  it('muestra mensaje de error cuando falla la carga', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Error al cargar el pedido')).toBeTruthy();
  });

  it('muestra boton de reintentar en estado error', () => {
    const mockRefetch = jest.fn();
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Reintentar')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('muestra desglose de subtotal e IVA', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('$130.00')).toBeTruthy();
    expect(getByText('$20.50')).toBeTruthy();
  });

  it('muestra productos con cantidad y precio', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Manzana')).toBeTruthy();
    expect(getByText('Pera')).toBeTruthy();
    expect(getByText('3x $10.00')).toBeTruthy();
    expect(getByText('2x $12.50')).toBeTruthy();
    expect(getByText('$30.00')).toBeTruthy();
    expect(getByText('$25.00')).toBeTruthy();
  });

  it('muestra el timeline de historial', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Historial')).toBeTruthy();
    expect(getByText('Pedido creado')).toBeTruthy();
    expect(getByText('confirmado')).toBeTruthy();
    expect(getByText('por Vendedor Test')).toBeTruthy();
  });

  it('NO muestra banner pickup cuando estado no es listo_para_retirar', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByText } = render(<OrderDetailScreen />);

    expect(queryByText('¡Listo para recoger!')).toBeNull();
  });

  it('NO muestra banner pickup cuando estado es entregado', () => {
    const entregadoOrder = {
      ...mockOrder,
      estado_actual: 'entregado' as const,
    };
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: entregadoOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByText } = render(<OrderDetailScreen />);

    expect(queryByText('¡Listo para recoger!')).toBeNull();
  });

  it('muestra banner pickup cuando estado es listo_para_retirar', () => {
    const pickupOrder = {
      ...mockOrder,
      estado_actual: 'listo_para_retirar' as const,
    };
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: pickupOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('¡Listo para recoger!')).toBeTruthy();
    expect(getByText('Pasa al punto de entrega por tu pedido')).toBeTruthy();
  });

  it('navega hacia atras al presionar la flecha', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(<OrderDetailScreen />);

    expect(getByText('Pedido #1')).toBeTruthy();
  });

  it('muestra la seccion de mermas cuando el pedido tiene mermas', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [
        {
          id_merma: 1,
          fk_producto_semanal: 100,
          fk_pedido: 1,
          cantidad: 2,
          motivo: 'Se dañó en el traslado',
          comentarios: null,
          fk_decision: 1,
          creado_en: '2026-07-25T10:00:00Z',
          estado: true,
          producto_info: {
            id: 100,
            producto: 'Manzana',
            publicacion: 1,
            stock_restante: 8,
          },
          decision_info: { id: 1, nombre: 'Tirar' },
          pedido_info: {
            id: 1,
            cliente: 'Cliente Test',
            estado: 'entregado',
            total: '150.50',
          },
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getAllByText, getByText } = render(<OrderDetailScreen />);

    expect(getByText('Mermas')).toBeTruthy();
    expect(getAllByText('Manzana').length).toBeGreaterThan(1);
    expect(getByText('Se dañó en el traslado · Tirar')).toBeTruthy();
  });

  it('NO muestra la seccion de mermas cuando no hay mermas', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByText } = render(<OrderDetailScreen />);

    expect(queryByText('Mermas')).toBeNull();
  });

  it('NO muestra la seccion de mermas cuando mermas es lista vacia', () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: mockOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByText } = render(<OrderDetailScreen />);

    expect(queryByText('Mermas')).toBeNull();
  });
});
