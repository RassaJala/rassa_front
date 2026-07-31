import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMermasDashboard } from '../routes/AdminMermasDashboard';
import { fetchMermaResumen } from '../services/waste';

vi.mock('../services/waste', () => ({
  fetchMermaResumen: vi.fn(),
}));

const mockFetch = vi.mocked(fetchMermaResumen);

const mockResumen = {
  agrupacion: 'mes',
  total_general: 12,
  producto_mas_afectado: { nombre: 'Manzana', total: 8 },
  detalle: [
    {
      periodo: '2026-07-01T00:00:00-03:00',
      producto_nombre: 'Manzana',
      producto_id: 1,
      decision_nombre: 'tirar',
      decision_id: 1,
      total_cantidad: 5,
      total_mermas: 3,
    },
    {
      periodo: '2026-07-01T00:00:00-03:00',
      producto_nombre: 'Pera',
      producto_id: 2,
      decision_nombre: 'donar',
      decision_id: 2,
      total_cantidad: 3,
      total_mermas: 2,
    },
  ],
};

const emptyResumen = {
  agrupacion: 'mes',
  total_general: 0,
  producto_mas_afectado: null,
  detalle: [],
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminMermasDashboard />
    </QueryClientProvider>,
  );
}

describe('AdminMermasDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner on initial load', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    renderDashboard();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error state with retry when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    renderDashboard();

    expect(
      await screen.findByText('Error al cargar datos'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('shows empty state when there are no mermas', async () => {
    mockFetch.mockResolvedValue(emptyResumen);

    renderDashboard();

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });

  it('renders the full dashboard with data', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    renderDashboard();

    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();
    expect(
      screen.getByText('Ranking de productos más mermados'),
    ).toBeInTheDocument();
    expect(screen.getByText('Detalle de mermas')).toBeInTheDocument();
    expect(screen.getAllByText('Manzana').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pera').length).toBeGreaterThan(0);
  });

  it('shows the stale-data banner when a refetch fails after data was loaded', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResumen)
      .mockRejectedValueOnce(new Error('Network error'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminMermasDashboard />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();

    // A refetch of the loaded query fails; previous data is kept as placeholder.
    await act(async () => {
      queryClient.invalidateQueries();
    });

    expect(
      await screen.findByText(
        /No se pudieron cargar los datos para los filtros seleccionados/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Datos desactualizados')).toBeInTheDocument();
  });
});
