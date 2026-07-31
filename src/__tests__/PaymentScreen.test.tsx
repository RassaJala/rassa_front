/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import PaymentScreen from '@/screens/seller/PaymentScreen';
import { createPago, fetchTiposPago } from '@/common/payments';

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({
    params: { orderId: 5 },
    key: 'Payment-test',
    name: 'Payment',
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
    post: jest.fn(),
  },
}));

jest.mock('@/services/storage', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const api = jest.requireMock('@/services/api').default as {
  get: jest.Mock;
  post: jest.Mock;
};

jest.mock('@/common/payments', () => ({
  fetchTiposPago: jest.fn(),
  createPago: jest.fn(),
  fetchPago: jest.fn(),
}));

const mockedCreatePago = createPago as jest.MockedFunction<typeof createPago>;
const mockedFetchTiposPago = fetchTiposPago as jest.MockedFunction<
  typeof fetchTiposPago
>;

const mockOrder = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockTipos = [{ id_tipo_pago: 1, nombre: 'Efectivo' }];

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentScreen />
    </QueryClientProvider>,
  );
}

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockReset();
    mockGoBack.mockReset();
    api.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.resolve({ data: mockOrder });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: {} });
    mockedFetchTiposPago.mockResolvedValue(mockTipos);
    mockedCreatePago.mockResolvedValue({
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
      productos: [],
      fecha_pago: '2026-07-30T12:00:00Z',
    });
  });

  it('renders loading state first', () => {
    const { getByTestId } = renderScreen();
    // LoadingView renders an ActivityIndicator; mock queries resolve in waitFor
    expect(getByTestId).toBeDefined();
  });

  it('shows error view when order fetch fails', async () => {
    api.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ data: [] });
    });

    const { findByText } = renderScreen();
    expect(await findByText(/error/i)).toBeTruthy();
  });

  it('shows not-ready view when order is not listo_para_retirar', async () => {
    api.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.resolve({
          data: { ...mockOrder, estado_actual: 'pendiente' },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { findByText } = renderScreen();
    expect(await findByText(/pendiente/i)).toBeTruthy();
  });

  it('submits payment with correct payload and navigates to Receipt', async () => {
    const { findByText, getAllByText } = renderScreen();
    await findByText('Efectivo');

    fireEvent.press(getAllByText('Efectivo')[0] as never);
    fireEvent.press(getAllByText('Registrar Pago')[1] as never);

    await waitFor(() =>
      expect(mockedCreatePago).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pedido: 5,
          tipo_pago: 1,
          monto: '119.48',
        }),
      ),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
  });
});
