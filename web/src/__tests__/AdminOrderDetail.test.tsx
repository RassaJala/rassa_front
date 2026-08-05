/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminOrderDetail } from '../routes/AdminOrderDetail';
import api from '../services/api';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ resolved: 'light' }),
}));

const mockGet = api.get as ReturnType<typeof vi.fn>;

const mockHistorial = [
  {
    id_historial: 1,
    estado_anterior: null,
    estado_nuevo: 'pendiente',
    cambiado_por_nombre: 'Cliente Test',
    creado_en: '2026-07-24T10:00:00Z',
  },
];

const mockMerma = {
  id_merma: 1,
  fk_producto_semanal: 100,
  fk_pedido: 1,
  cantidad: 2,
  motivo: 'Se dañó en el traslado',
  comentarios: null,
  fk_decision: 1,
  creado_en: '2026-07-25T10:00:00Z',
  estado: true,
  producto_info: {
    id: 100,
    producto: 'Manzana',
    publicacion: 1,
    stock_restante: 8,
  },
  decision_info: { id: 1, nombre: 'Tirar' },
  pedido_info: {
    id: 1,
    cliente: 'Cliente Test',
    estado: 'entregado',
    total: '150.50',
  },
};

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/pedidos/1']}>
        <Routes>
          <Route path="/admin/pedidos/:id" element={<AdminOrderDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows mermas section when the order has mermas', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/mermas/')) {
        return Promise.resolve({ data: { data: { results: [mockMerma] } } });
      }
      return Promise.resolve({ data: mockHistorial });
    });

    renderDetail();

    const manzanas = await screen.findAllByText('Manzana');
    expect(manzanas).toHaveLength(1);
    expect(
      await screen.findByText('Se dañó en el traslado · Tirar'),
    ).toBeInTheDocument();
  });

  it('shows empty state when the order has no mermas', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/mermas/')) {
        return Promise.resolve({ data: { data: { results: [] } } });
      }
      return Promise.resolve({ data: mockHistorial });
    });

    renderDetail();

    expect(
      await screen.findByText('Este pedido no tiene mermas'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Se dañó en el traslado'),
    ).not.toBeInTheDocument();
  });
});
