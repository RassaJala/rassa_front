import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import type { OrderStatusHistory } from '@/types';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

const mockRefetch = jest.fn();
const mockOnBack = jest.fn();

jest.mock('@/hooks/useOrderTimeline', () => ({
  useOrderTimeline: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

import OrderTimeline from '@/components/OrderTimeline';
import { useOrderTimeline } from '@/hooks/useOrderTimeline';

const mockUseOrderTimeline = useOrderTimeline as jest.MockedFunction<
  typeof useOrderTimeline
>;

const baseEntry: OrderStatusHistory = {
  id_historial: 1,
  estado_anterior: null,
  estado_nuevo: 'pendiente',
  creado_en: '2025-06-15T10:30:00Z',
  cambiado_por_nombre: null,
};

describe('OrderTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<OrderTimeline orderId={1} />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders error state with retry button', () => {
    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: true,
      error: new Error('test'),
      refetch: mockRefetch,
    });

    const { getByText } = render(<OrderTimeline orderId={1} />);
    expect(getByText('Error al cargar el historial')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
  });

  it('renders 404 state without retry, shows Volver when onBack provided', () => {
    const axios404 = new Error('Not found');
    (axios404 as unknown as Record<string, unknown>).isAxiosError = true;
    (axios404 as unknown as Record<string, unknown>).response = { status: 404 };

    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: true,
      error: axios404,
      refetch: mockRefetch,
    });

    const { getByText, queryByText } = render(
      <OrderTimeline orderId={1} onBack={mockOnBack} />,
    );
    expect(getByText('Pedido no encontrado')).toBeTruthy();
    expect(queryByText('Reintentar')).toBeNull();
    expect(getByText('Volver')).toBeTruthy();
  });

  it('renders 404 state without Volver when onBack is not provided', () => {
    const axios404 = new Error('Not found');
    (axios404 as unknown as Record<string, unknown>).isAxiosError = true;
    (axios404 as unknown as Record<string, unknown>).response = { status: 404 };

    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: true,
      error: axios404,
      refetch: mockRefetch,
    });

    const { queryByText } = render(<OrderTimeline orderId={1} />);
    expect(queryByText('Volver')).toBeNull();
  });

  it('calls onBack when Volver is pressed in 404', () => {
    const axios404 = new Error('Not found');
    (axios404 as unknown as Record<string, unknown>).isAxiosError = true;
    (axios404 as unknown as Record<string, unknown>).response = { status: 404 };

    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: true,
      error: axios404,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <OrderTimeline orderId={1} onBack={mockOnBack} />,
    );
    fireEvent.press(getByText('Volver'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls refetch when retry is pressed', () => {
    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: true,
      error: new Error('test'),
      refetch: mockRefetch,
    });

    const { getByText } = render(<OrderTimeline orderId={1} />);
    fireEvent.press(getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders empty state', () => {
    mockUseOrderTimeline.mockReturnValue({
      entries: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = render(<OrderTimeline orderId={1} />);
    expect(getByText('Sin historial de cambios')).toBeTruthy();
  });

  it('renders entries with partial data (null optional fields)', () => {
    const entries: OrderStatusHistory[] = [
      {
        ...baseEntry,
        id_historial: 1,
        estado_anterior: null,
        estado_nuevo: 'pendiente',
        cambiado_por_nombre: null,
      },
    ];

    mockUseOrderTimeline.mockReturnValue({
      entries,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, queryByText } = render(<OrderTimeline orderId={1} />);
    expect(getByText('Pedido creado')).toBeTruthy();
    expect(queryByText('Admin')).toBeNull();
  });

  it('renders timeline entries', () => {
    const entries: OrderStatusHistory[] = [
      {
        ...baseEntry,
        id_historial: 1,
        estado_nuevo: 'pendiente',
        estado_anterior: null,
      },
      {
        ...baseEntry,
        id_historial: 2,
        estado_anterior: 'pendiente',
        estado_nuevo: 'confirmado',
        cambiado_por_nombre: 'Admin',
      },
    ];

    mockUseOrderTimeline.mockReturnValue({
      entries,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = render(<OrderTimeline orderId={1} />);
    expect(getByText('Pedido creado')).toBeTruthy();
    expect(getByText('Pendiente → Confirmado')).toBeTruthy();
    expect(getByText('Admin')).toBeTruthy();
  });
});
