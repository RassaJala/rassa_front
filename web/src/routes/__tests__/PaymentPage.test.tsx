import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockParams = { current: { orderId: '5' } };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams.current,
}));

vi.mock('../../hooks/useAppColors', () => ({
  useAppColors: () => ({
    isDark: false,
    brand: '#24563C',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(36,86,60,0.07)',
  }),
}));

vi.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/common/payments', async () => ({
  ...(await vi.importActual('@/common/payments')),
  fetchTiposPago: vi.fn(),
  createPago: vi.fn(),
  fetchPago: vi.fn(),
  fetchPagoPorPedido: vi.fn(),
}));

import api from '../../services/api';
import {
  createPago,
  fetchPagoPorPedido,
  fetchTiposPago,
} from '@/common/payments';
import { PaymentPage } from '../PaymentPage';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};
const mockedFetchTiposPago = vi.mocked(fetchTiposPago);
const mockedCreatePago = vi.mocked(createPago);
const mockedFetchPagoPorPedido = vi.mocked(fetchPagoPorPedido);

const mockOrder = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentPage />
    </QueryClientProvider>,
  );
}

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    window.localStorage.clear();
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.resolve({ data: mockOrder });
      }
      return Promise.resolve({ data: [] });
    });
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedFetchTiposPago.mockResolvedValue(mockTipos);
    mockedFetchPagoPorPedido.mockResolvedValue(null);
    mockedCreatePago.mockResolvedValue(mockPago);
  });

  it('shows error view when order fetch fails', async () => {
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(await screen.findByText(/Error al cargar el pedido/i)).toBeTruthy();
  });

  it('shows not-ready view when order is not listo_para_retirar', async () => {
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.resolve({
          data: { ...mockOrder, estado_actual: 'pendiente' },
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(
      await screen.findByText(/Pedido no disponible para cobro/i),
    ).toBeTruthy();
  });

  it('submits payment with correct payload and navigates to receipt', async () => {
    const user = userEvent.setup();
    renderPage();

    // Cash is the only payment method: fixed line, no method selector.
    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    await user.click(screen.getByTestId('submit-payment-button'));

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
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
  });

  it('shows an error message when createPago fails and allows retry', async () => {
    const user = userEvent.setup();
    mockedCreatePago.mockRejectedValue(new Error('Network error'));
    renderPage();

    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    await user.click(screen.getByTestId('submit-payment-button'));

    expect(await screen.findByText(/Network error/i)).toBeTruthy();
    // Button is enabled again so the seller can retry
    await waitFor(() =>
      expect(
        (screen.getByTestId('submit-payment-button') as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  it('navigates to the receipt when createPago fails but the payment exists (reconciliation)', async () => {
    const user = userEvent.setup();
    // Pre-POST check finds nothing; the onError reconciliation finds the
    // payment that the failed POST actually created server-side.
    let reconcileCalls = 0;
    mockedFetchPagoPorPedido.mockImplementation(() => {
      reconcileCalls += 1;
      return Promise.resolve(reconcileCalls === 1 ? null : mockPago);
    });
    mockedCreatePago.mockRejectedValue(new Error('Network error'));
    renderPage();

    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    await user.click(screen.getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
    // No error shown: the payment actually succeeded server-side
    expect(screen.queryByText(/Network error/i)).toBeNull();
  });

  it('disables the submit button while the payment is pending (no double tap)', async () => {
    const user = userEvent.setup();
    let resolveCreate: (v: unknown) => void = () => {};
    mockedCreatePago.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderPage();

    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    await user.click(screen.getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(
        (screen.getByTestId('submit-payment-button') as HTMLButtonElement)
          .disabled,
      ).toBe(true),
    );
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);

    resolveCreate({
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
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
  });

  it('same-frame double press does not create a second payment', async () => {
    renderPage();

    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    const button = screen.getByTestId('submit-payment-button');
    // Two synchronous clicks before any await: the in-flight guard must stop
    // the second one, even though isPending has not rendered yet.
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);
  });

  it('retry after timeout never double-charges', async () => {
    const user = userEvent.setup();
    // First pre-POST check and the onError reconciliation both find nothing;
    // once the second press happens, the server-side payment is visible.
    let reconcileCalls = 0;
    mockedFetchPagoPorPedido.mockImplementation(() => {
      reconcileCalls += 1;
      return Promise.resolve(reconcileCalls < 3 ? null : mockPago);
    });
    mockedCreatePago.mockRejectedValueOnce(new Error('Network error'));
    renderPage();

    expect(await screen.findByText(/Efectivo/i)).toBeTruthy();
    await user.click(screen.getByTestId('submit-payment-button'));
    expect(await screen.findByText(/Network error/i)).toBeTruthy();

    // Second attempt: the pre-POST reconciliation finds the payment that the
    // first POST created, so no second POST is sent.
    await user.click(screen.getByTestId('submit-payment-button'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
    expect(mockedCreatePago).toHaveBeenCalledTimes(1);
  });
});
