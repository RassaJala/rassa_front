/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ReceiptDetailScreen from '@/screens/buyer/ReceiptDetailScreen';
import { fetchPago } from '@/common/payments';
import { useAuth } from '@/store/AuthContext';

const mockGoBack = jest.fn();
const mockParams = { current: { paymentId: 9 } };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockParams.current,
    key: 'ReceiptDetail-test',
    name: 'ReceiptDetail',
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/common/payments', () => ({
  ...jest.requireActual('@/common/payments'),
  fetchTiposPago: jest.fn(),
  createPago: jest.fn(),
  fetchPago: jest.fn(),
  fetchPagos: jest.fn(),
}));

const mockedFetchPago = fetchPago as jest.MockedFunction<typeof fetchPago>;

const mockPago = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 5,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Test',
  cliente_id: 4,
  monto: '119.48',
  referencia: 'TEST-001',
  total_pedido: '119.48',
  productos: [{ nombre: 'Manzana', precio: '59.74', cantidad: 2 }],
  fecha_pago: '2026-07-30T12:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptDetailScreen />
    </QueryClientProvider>,
  );
}

describe('ReceiptDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockReset();
    mockParams.current = { paymentId: 9 };
    mockedFetchPago.mockResolvedValue(mockPago);
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 4 } });
  });

  it('renders the receipt fields after fetch', async () => {
    const { findByText, findAllByText } = renderScreen();

    expect(await findByText('Recibo PAG-0009')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    expect(await findByText('#5')).toBeTruthy();
    expect(await findByText('Cliente Test')).toBeTruthy();
    expect(await findByText('Efectivo')).toBeTruthy();
    expect(await findByText('TEST-001')).toBeTruthy();
    expect(await findByText('Manzana')).toBeTruthy();
    expect(await findByText('2x $59.74')).toBeTruthy();
    expect(await findByText('Subtotal')).toBeTruthy();
    // subtotal (2 x 59.74) and total pagado both render $119.48
    const totals = await findAllByText('$119.48');
    expect(totals.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render reference when absent', async () => {
    mockedFetchPago.mockResolvedValue({ ...mockPago, referencia: '' });

    const { findByText, queryByText } = renderScreen();
    expect(await findByText('Manzana')).toBeTruthy();
    expect(queryByText('Referencia')).toBeNull();
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    const { findByText } = renderScreen();
    expect(await findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(await findByText('Reintentar')).toBeTruthy();
  });

  it('shows the error state and does not fetch when paymentId is invalid', async () => {
    mockParams.current = { paymentId: 'abc' as unknown as number };

    const { findByText } = renderScreen();
    expect(await findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(mockedFetchPago).not.toHaveBeenCalled();
  });

  it('does not render a receipt owned by another user (IDOR defense)', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 99 } });

    const { findByText, queryByText } = renderScreen();
    expect(await findByText(/No tienes acceso a este recibo/i)).toBeTruthy();
    // El recibo ajeno fue cargado por la API (mock activo) pero NUNCA se
    // renderiza su contenido: ni folio, ni productos, ni monto.
    expect(queryByText('PAG-0009')).toBeNull();
    expect(queryByText('Manzana')).toBeNull();
    expect(queryByText('Cliente Test')).toBeNull();
  });

  it('renders without crashing when productos is null (defensive ?? [])', async () => {
    mockedFetchPago.mockResolvedValue({
      ...mockPago,
      productos: null as unknown as typeof mockPago.productos,
    });

    const { findByText, queryByText } = renderScreen();
    // No filas de productos y el resto del recibo sigue visible.
    expect(await findByText('Subtotal')).toBeTruthy();
    expect(queryByText('Manzana')).toBeNull();
    expect(await findByText('Recibo PAG-0009')).toBeTruthy();
  });
});
