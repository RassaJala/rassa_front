import { render, screen, waitFor } from '@testing-library/react';
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
}));

import api from '../../services/api';
import { createPago, fetchTiposPago } from '@/common/payments';
import { PaymentPage } from '../PaymentPage';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};
const mockedFetchTiposPago = vi.mocked(fetchTiposPago);
const mockedCreatePago = vi.mocked(createPago);

const mockOrder = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
};

const mockTipos = [{ id_tipo_pago: 1, nombre: 'Efectivo' }];

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
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/pedidos/5/') {
        return Promise.resolve({ data: mockOrder });
      }
      return Promise.resolve({ data: [] });
    });
    mockedApi.post.mockResolvedValue({ data: {} });
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

    const efectivo = await screen.findByText(/Efectivo/i);
    await user.click(efectivo);
    await user.click(screen.getByTestId('submit-payment-button'));

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
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9', {
        replace: true,
      }),
    );
  });

  it('shows an error message when createPago fails and allows retry', async () => {
    const user = userEvent.setup();
    mockedCreatePago.mockRejectedValue(new Error('Network error'));
    renderPage();

    const efectivo = await screen.findByText(/Efectivo/i);
    await user.click(efectivo);
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

    const efectivo = await screen.findByText(/Efectivo/i);
    await user.click(efectivo);
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
});
