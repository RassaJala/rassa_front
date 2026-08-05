/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../services/api';
import { BuyerOrderDetail } from '../routes/BuyerOrderDetail';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ resolved: 'light' }),
}));

const mockGet = api.get as ReturnType<typeof vi.fn>;

const mockOrder = {
  id_pedido: 1,
  total: '150.50',
  subtotal: '130.00',
  iva: '20.50',
  estado_actual: 'pendiente',
  creado_en: '2026-07-24T10:00:00Z',
  fecha_expiracion: null,
  detalles: [
    {
      id_detalle: 1,
      nombre_producto: 'Manzana',
      precio_unitario: '10.00',
      cantidad: 3,
      importe: '30.00',
    },
  ],
  historial: [
    {
      id_historial: 1,
      estado_anterior: null,
      estado_nuevo: 'pendiente',
      cambiado_por_nombre: 'Cliente Test',
      creado_en: '2026-07-24T10:00:00Z',
    },
  ],
};

const mockMerma = {
  id_merma: 1,
  fk_producto_semanal: 100,
  fk_pedido: 1,
  cantidad: 2,
  motivo: 'Se dañó en el traslado',
  comentarios: 'Nota interna del staff',
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
      <MemoryRouter initialEntries={['/cliente/pedidos/1']}>
        <Routes>
          <Route path="/cliente/pedidos/:id" element={<BuyerOrderDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BuyerOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows mermas section when the order has mermas', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/mermas/')) {
        return Promise.resolve({ data: { data: { results: [mockMerma] } } });
      }
      return Promise.resolve({ data: mockOrder });
    });

    renderDetail();

    expect(await screen.findByText('Mermas')).toBeInTheDocument();
    expect(screen.getAllByText('Manzana').length).toBeGreaterThan(1);
    expect(
      screen.getByText('Se dañó en el traslado · Tirar'),
    ).toBeInTheDocument();
  });

  it('does not show mermas section when the order has none', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/mermas/')) {
        return Promise.resolve({ data: { data: { results: [] } } });
      }
      return Promise.resolve({ data: mockOrder });
    });

    renderDetail();

    expect(await screen.findByText('Pedido #1')).toBeInTheDocument();
    expect(screen.queryByText('Mermas')).not.toBeInTheDocument();
  });

  it('never shows internal comments to the buyer (showComentarios=false)', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/mermas/')) {
        return Promise.resolve({ data: { data: { results: [mockMerma] } } });
      }
      return Promise.resolve({ data: mockOrder });
    });

    renderDetail();

    expect(await screen.findByText('Mermas')).toBeInTheDocument();
    expect(
      screen.queryByText('Nota interna del staff'),
    ).not.toBeInTheDocument();
  });
});
