/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ReceiptListScreen from '@/screens/buyer/ReceiptListScreen';
import { fetchPagos } from '@/common/payments';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
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

const mockedFetchPagos = fetchPagos as jest.MockedFunction<typeof fetchPagos>;

const mockPagos = [
  {
    id_pago: 9,
    folio: 'PAG-0009',
    pedido: 5,
    tipo_pago: 1,
    tipo_pago_nombre: 'Efectivo',
    cliente_nombre: 'Cliente Test',
    cliente_id: 4,
    monto: '119.48',
    referencia: '',
    total_pedido: '119.48',
    productos: [{ nombre: 'Manzana', precio: '59.74', cantidad: 2 }],
    fecha_pago: '2026-07-30T12:00:00Z',
  },
  {
    id_pago: 10,
    folio: 'PAG-0010',
    pedido: null,
    tipo_pago: 1,
    tipo_pago_nombre: 'Efectivo',
    cliente_nombre: 'Cliente Test',
    cliente_id: 4,
    monto: '50.00',
    referencia: '',
    total_pedido: null,
    productos: [],
    fecha_pago: '2026-07-29T12:00:00Z',
  },
];

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptListScreen />
    </QueryClientProvider>,
  );
}

describe('ReceiptListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    mockGoBack.mockReset();
    mockedFetchPagos.mockResolvedValue(mockPagos);
  });

  it('renders the list of receipts from the API', async () => {
    const { findByText } = renderScreen();

    expect(await findByText('PAG-0009')).toBeTruthy();
    expect(await findByText('PAG-0010')).toBeTruthy();
    expect(await findByText('$119.48')).toBeTruthy();
    expect(await findByText('$50.00')).toBeTruthy();
    expect(await findByText('Pedido #5')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPagos).toHaveBeenCalledWith(expect.anything()),
    );
  });

  it('shows the empty state when there are no receipts', async () => {
    mockedFetchPagos.mockResolvedValue([]);

    const { findByText } = renderScreen();
    expect(await findByText('No tienes recibos aún')).toBeTruthy();
  });

  it('shows error state with Reintentar and refetches on press', async () => {
    // First call fails, refetch after pressing Reintentar resolves.
    mockedFetchPagos.mockRejectedValueOnce(new Error('Network error'));
    mockedFetchPagos.mockResolvedValueOnce(mockPagos);

    const { findByText } = renderScreen();
    expect(await findByText('Error al cargar recibos')).toBeTruthy();

    fireEvent.press(await findByText('Reintentar'));
    await waitFor(() => expect(mockedFetchPagos).toHaveBeenCalledTimes(2));
    expect(await findByText('PAG-0009')).toBeTruthy();
  });

  it('navigates to ReceiptDetail when a receipt is pressed', async () => {
    const { findByText } = renderScreen();

    fireEvent.press(await findByText('PAG-0009'));
    expect(mockNavigate).toHaveBeenCalledWith('ReceiptDetail', {
      paymentId: 9,
    });
  });
});
