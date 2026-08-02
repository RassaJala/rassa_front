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

vi.mock('@/common/payments', async () => ({
  ...(await vi.importActual('@/common/payments')),
  fetchTiposPago: vi.fn(),
  createPago: vi.fn(),
  fetchPago: vi.fn(),
}));

import { fetchPago } from '@/common/payments';
import { ReceiptPage } from '../ReceiptPage';

const mockedFetchPago = vi.mocked(fetchPago);

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
      <ReceiptPage />
    </QueryClientProvider>,
  );
}

describe('ReceiptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockParams.current = { paymentId: '9' };
    mockedFetchPago.mockResolvedValue(mockPago);
  });

  it('renders payment details after fetch', async () => {
    renderPage();

    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    expect((await screen.findAllByText('PAG-0009')).length).toBeGreaterThan(0);
    expect(screen.getByText('Pago Registrado')).toBeTruthy();
    expect(screen.getByText('Productos')).toBeTruthy();
    expect(screen.getByText('Resumen del pago')).toBeTruthy();
    expect(screen.getByText('Manzana')).toBeTruthy();
    expect(screen.getByText('Cliente Test')).toBeTruthy();
    expect(screen.getByText('Total pagado')).toBeTruthy();
  });

  it('renders product rows with quantity, price and subtotal', async () => {
    renderPage();

    expect(await screen.findByText('Manzana')).toBeTruthy();
    // Quantity 2x and $59.74 each => importe $119.48 (también en Total pagado)
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('$59.74')).toBeTruthy();
    expect(
      (await screen.findAllByText('$119.48')).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    renderPage();
    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
  });

  it('shows the error state and does not fetch when paymentId is invalid', async () => {
    mockParams.current = { paymentId: 'abc' };
    renderPage();

    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(mockedFetchPago).not.toHaveBeenCalled();
  });
});
