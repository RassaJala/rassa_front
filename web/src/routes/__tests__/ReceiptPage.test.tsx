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

vi.mock('@/common/payments', () => ({
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
    mockedFetchPago.mockResolvedValue(mockPago);
  });

  it('renders payment details after fetch', async () => {
    renderPage();

    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    expect((await screen.findAllByText('PAG-0009')).length).toBeGreaterThan(0);
    expect(screen.getByText('Manzana')).toBeTruthy();
    expect(screen.getByText('Cliente Test')).toBeTruthy();
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    renderPage();
    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
  });
});
