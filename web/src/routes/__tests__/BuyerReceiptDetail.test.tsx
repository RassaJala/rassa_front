import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockParams = { current: { paymentId: '9' } };

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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/common/payments', async () => ({
  ...(await vi.importActual('@/common/payments')),
  fetchTiposPago: vi.fn(),
  createPago: vi.fn(),
  fetchPago: vi.fn(),
  fetchPagos: vi.fn(),
}));

import { fetchPago } from '@/common/payments';
import { useAuth } from '../../hooks/useAuth';
import { BuyerReceiptDetail } from '../BuyerReceiptDetail';

const mockedFetchPago = vi.mocked(fetchPago);
const mockedUseAuth = vi.mocked(useAuth);

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BuyerReceiptDetail />
    </QueryClientProvider>,
  );
}

describe('BuyerReceiptDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockParams.current = { paymentId: '9' };
    mockedFetchPago.mockResolvedValue(mockPago);
    mockedUseAuth.mockReturnValue({ user: { id: 4 } } as never);
  });

  it('renders the receipt fields after fetch', async () => {
    renderPage();

    expect(await screen.findByText('Recibo PAG-0009')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    expect(screen.getByText('#5')).toBeTruthy();
    expect(screen.getByText('Cliente Test')).toBeTruthy();
    expect(screen.getByText('Efectivo')).toBeTruthy();
    expect(screen.getByText('TEST-001')).toBeTruthy();
    expect(screen.getByText('Manzana')).toBeTruthy();
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('Total pagado')).toBeTruthy();
    // subtotal (2 x 59.74) and total pagado both render $119.48
    expect(screen.getAllByText('$119.48').length).toBeGreaterThanOrEqual(2);
  });

  it('does not render reference or pedido when absent', async () => {
    mockedFetchPago.mockResolvedValue({
      ...mockPago,
      referencia: '',
      pedido: null,
    });

    renderPage();
    expect(await screen.findByText('Manzana')).toBeTruthy();
    expect(screen.queryByText('Referencia')).toBeNull();
    expect(screen.queryByText('Pedido')).toBeNull();
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    renderPage();
    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('shows error state and does not fetch when paymentId is invalid', async () => {
    mockParams.current = { paymentId: 'abc' };

    renderPage();
    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(mockedFetchPago).not.toHaveBeenCalled();
  });

  it('does not render a receipt owned by another user (IDOR defense)', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 99 } } as never);

    renderPage();
    expect(
      await screen.findByText(/No tienes acceso a este recibo/i),
    ).toBeTruthy();
    // El recibo ajeno fue cargado por la API (mock activo) pero NUNCA se
    // renderiza su contenido: ni folio, ni productos, ni cliente.
    expect(screen.queryByText('PAG-0009')).toBeNull();
    expect(screen.queryByText('Manzana')).toBeNull();
    expect(screen.queryByText('Cliente Test')).toBeNull();
  });
});
