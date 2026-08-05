/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../services/api';
import { BuyerOrders } from '../routes/BuyerOrders';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ resolved: 'light' }),
}));

const mockGet = api.get as ReturnType<typeof vi.fn>;

const mockOrders = [
  {
    id_pedido: 1,
    total: '150.50',
    estado_actual: 'pendiente',
    creado_en: '2026-07-24T10:00:00Z',
    productos: ['Manzana', 'Pera'],
    has_more_productos: false,
    tiene_mermas: true,
  },
  {
    id_pedido: 2,
    total: '320.00',
    estado_actual: 'listo_para_retirar',
    creado_en: '2026-07-23T15:30:00Z',
    productos: ['Lechuga', 'Tomate'],
    has_more_productos: false,
    tiene_mermas: false,
  },
];

function renderOrders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BuyerOrders />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BuyerOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Con mermas badge when an order has mermas', async () => {
    mockGet.mockResolvedValue({ data: { results: mockOrders } });

    renderOrders();

    // Rendered twice: desktop table + mobile card grid.
    expect((await screen.findAllByText('Con mermas')).length).toBeGreaterThan(
      0,
    );
  });

  it('does not show badge when no order has mermas', async () => {
    mockGet.mockResolvedValue({
      data: { results: mockOrders.map((o) => ({ ...o, tiene_mermas: false })) },
    });

    renderOrders();

    expect((await screen.findAllByText('150.50')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Con mermas')).not.toBeInTheDocument();
  });

  it('filters to mermas-only orders when checked', async () => {
    mockGet.mockResolvedValue({ data: { results: mockOrders } });

    renderOrders();

    expect((await screen.findAllByText('320.00')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Solo con mermas'));

    expect(screen.queryByText('320.00')).not.toBeInTheDocument();
    expect((await screen.findAllByText('150.50')).length).toBeGreaterThan(0);
  });
});
