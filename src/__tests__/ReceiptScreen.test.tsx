/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ReceiptScreen from '@/screens/seller/ReceiptScreen';
import { fetchPago } from '@/common/payments';

const mockGoBack = jest.fn();
const mockPopToTop = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    popToTop: mockPopToTop,
  }),
  useRoute: () => ({
    params: { paymentId: 9 },
    key: 'Receipt-test',
    name: 'Receipt',
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

jest.mock('@/common/payments', () => ({
  fetchTiposPago: jest.fn(),
  createPago: jest.fn(),
  fetchPago: jest.fn(),
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
      <ReceiptScreen />
    </QueryClientProvider>,
  );
}

describe('ReceiptScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchPago.mockResolvedValue(mockPago);
  });

  it('renders payment details after fetch', async () => {
    const { findByText, findAllByText } = renderScreen();

    expect(await findByText('Recibo de Pago')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    const folios = await findAllByText('PAG-0009');
    expect(folios.length).toBeGreaterThan(0);
    expect(await findByText('Manzana')).toBeTruthy();
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    const { findByText } = renderScreen();
    expect(await findByText(/Error al cargar el recibo/i)).toBeTruthy();
  });
});
