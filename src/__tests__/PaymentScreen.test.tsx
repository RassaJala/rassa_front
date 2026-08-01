/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import PaymentScreen from '@/screens/seller/PaymentScreen';
import {
  createPago,
  fetchPagoPorPedido,
  fetchTiposPago,
} from '@/common/payments';
import type { PaymentDetail } from '@/common/payments';

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
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const api = jest.requireMock('@/services/api').default as {
  get: jest.Mock;
  post: jest.Mock;
};

jest.mock('@/common/payments', () => ({
  ...jest.requireActual('@/common/payments'),
  fetchTiposPago: jest.fn(),
  createPago: jest.fn(),
  fetchPago: jest.fn(),
  fetchPagoPorPedido: jest.fn(),
}));

const mockedCreatePago = createPago as jest.MockedFunction<typeof createPago>;
const mockedFetchTiposPago = fetchTiposPago as jest.MockedFunction<
  typeof fetchTiposPago
>;
const mockedFetchPagoPorPedido = fetchPagoPorPedido as jest.MockedFunction<
  typeof fetchPagoPorPedido
>;

const mockOrder = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockTipos = [{ id_tipo_pago: 1, nombre: 'Efectivo' }];

const mockPago = {
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
};

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
    mockedFetchPagoPorPedido.mockResolvedValue(null);
    mockedCreatePago.mockResolvedValue(mockPago);
  });

  it('renders the payment form after queries resolve', async () => {
    const { findByTestId } = renderScreen();
    expect(await findByTestId('submit-payment-button')).toBeTruthy();
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
    const { findByTestId, getByTestId, findByText, queryByTestId } =
      renderScreen();
    await findByTestId('submit-payment-button');

    // Cash is the only payment method: fixed line, no method selector.
    expect(queryByTestId('payment-method-option')).toBeNull();
    expect(await findByText('Efectivo')).toBeTruthy();
    fireEvent.press(getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockedCreatePago).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pedido: 5,
          tipo_pago: 1,
          monto: '119.48',
        }),
        expect.any(String),
      ),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
  });

  it('shows an alert and re-enables submit when createPago fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedCreatePago.mockRejectedValue(new Error('Network error'));

    const { findByTestId, getByTestId } = renderScreen();
    await findByTestId('submit-payment-button');

    fireEvent.press(getByTestId('submit-payment-button'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0]?.[1]).toMatch(/error/i);
    // Seller can retry after the failure: a second press calls createPago again
    fireEvent.press(getByTestId('submit-payment-button'));
    await waitFor(() => expect(mockedCreatePago).toHaveBeenCalledTimes(2));
    alertSpy.mockRestore();
  });

  it('navigates to Receipt when createPago fails but the payment exists (reconciliation)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Pre-POST check finds nothing; the onError reconciliation finds the
    // payment that the failed POST actually created server-side.
    let reconcileCalls = 0;
    mockedFetchPagoPorPedido.mockImplementation(() => {
      reconcileCalls += 1;
      return Promise.resolve(reconcileCalls === 1 ? null : mockPago);
    });
    mockedCreatePago.mockRejectedValue(new Error('Network error'));

    const { findByTestId, getByTestId } = renderScreen();
    await findByTestId('submit-payment-button');

    fireEvent.press(getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
    // No error alert: the payment actually succeeded server-side
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('disables the submit button while the payment is pending (no double tap)', async () => {
    let resolveCreate: (value: PaymentDetail) => void = () => {};
    mockedCreatePago.mockImplementation(
      () =>
        new Promise<PaymentDetail>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const { findByTestId, getByTestId, getByText } = renderScreen();
    await findByTestId('submit-payment-button');

    fireEvent.press(getByTestId('submit-payment-button'));

    // Wait until the pending state is rendered ("Registrando...")
    await waitFor(() => expect(getByText('Registrando...')).toBeTruthy());

    // A second tap while pending must NOT create a second payment
    fireEvent.press(getByTestId('submit-payment-button'));
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);

    resolveCreate(mockPago);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
  });

  it('same-frame double press does not create a second payment', async () => {
    const { findByTestId, getByTestId } = renderScreen();
    await findByTestId('submit-payment-button');

    // Two synchronous presses before any await: the in-flight guard must stop
    // the second one, even though isPending has not rendered yet.
    fireEvent.press(getByTestId('submit-payment-button'));
    fireEvent.press(getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);
  });

  it('retry after timeout never double-charges', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // First pre-POST check and the onError reconciliation both find nothing;
    // once the second press happens, the server-side payment is visible.
    let reconcileCalls = 0;
    mockedFetchPagoPorPedido.mockImplementation(() => {
      reconcileCalls += 1;
      return Promise.resolve(reconcileCalls < 3 ? null : mockPago);
    });
    mockedCreatePago.mockRejectedValueOnce(new Error('Network error'));

    const { findByTestId, getByTestId } = renderScreen();
    await findByTestId('submit-payment-button');

    fireEvent.press(getByTestId('submit-payment-button'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    // Second attempt: the pre-POST reconciliation finds the payment that the
    // first POST created, so no second POST is sent.
    fireEvent.press(getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
