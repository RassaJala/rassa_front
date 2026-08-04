import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  useAuth: vi.fn(() => ({ user: { id: 4 } })),
}));

vi.mock('@/common/payments', async () => ({
  ...(await vi.importActual('@/common/payments')),
  fetchTiposPago: vi.fn(),
  createPago: vi.fn(),
  fetchPago: vi.fn(),
  fetchPagos: vi.fn(),
}));

import { fetchPagos } from '@/common/payments';
import { BuyerReceipts } from '../BuyerReceipts';

const mockedFetchPagos = vi.mocked(fetchPagos);

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
    cliente_nombre: 'Cliente Ajeno',
    cliente_id: 99,
    monto: '50.00',
    referencia: '',
    total_pedido: null,
    productos: [],
    fecha_pago: '2026-07-29T12:00:00Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cliente/recibos']}>
        <BuyerReceipts />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BuyerReceipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchPagos.mockResolvedValue(mockPagos);
  });

  it('renders only the receipts owned by the current user (mixed payload)', async () => {
    renderPage();

    expect(await screen.findByText('Mis Recibos')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPagos).toHaveBeenCalledWith(expect.anything()),
    );
    // Propio (cliente_id 4): se renderiza folio y monto.
    expect(screen.getByText('PAG-0009')).toBeTruthy();
    expect(screen.getByText('$119.48')).toBeTruthy();
    expect(screen.getByText(/Pedido #5/)).toBeTruthy();
    // Ajeno (cliente_id 99): nunca se renderiza su folio ni su monto.
    expect(screen.queryByText('PAG-0010')).toBeNull();
    expect(screen.queryByText('$50.00')).toBeNull();
  });

  it('links each receipt to its detail page', async () => {
    renderPage();

    const link = (await screen.findByRole('link', {
      name: /PAG-0009/,
    })) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/cliente/recibos/9');
  });

  it('shows the empty state when there are no receipts', async () => {
    mockedFetchPagos.mockResolvedValue([]);

    renderPage();
    expect(await screen.findByText('No tienes recibos aún')).toBeTruthy();
  });

  it('shows error state and refetches on Reintentar', async () => {
    mockedFetchPagos.mockRejectedValueOnce(new Error('Network error'));
    mockedFetchPagos.mockResolvedValueOnce(mockPagos);

    renderPage();
    expect(await screen.findByText('Error al cargar recibos')).toBeTruthy();

    screen.getByText('Reintentar').click();
    await waitFor(() => expect(mockedFetchPagos).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('PAG-0009')).toBeTruthy();
  });
});
