import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WASTE_DETAIL_LIMIT } from '@/common/waste';
import { AdminMermasDashboard } from '../routes/AdminMermasDashboard';
import { fetchMermaResumen } from '../services/waste';

vi.mock('../services/waste', () => ({
  fetchMermaResumen: vi.fn(),
}));

const mockFetch = vi.mocked(fetchMermaResumen);

const mockResumen = {
  agrupacion: 'mes' as const,
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
  agrupacion: 'mes' as const,
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

  it('refetches with the new query params when a filter changes', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    renderDashboard();
    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Semana' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith({ agrupar_por: 'semana' });
    });
  });

  it('blocks the query and shows a warning when the date range is invalid', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    renderDashboard();
    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const dateInputs =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    const desde = dateInputs[0];
    const hasta = dateInputs[1];
    if (desde === undefined || hasta === undefined) {
      throw new Error('Expected two date inputs in the filter bar');
    }

    await act(async () => {
      fireEvent.change(desde, { target: { value: '2026-07-10' } });
      fireEvent.change(hasta, { target: { value: '2026-07-01' } });
    });

    expect(
      screen.getByText('La fecha «Hasta» debe ser mayor o igual a «Desde».'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalledWith({
      agrupar_por: 'mes',
      fecha_desde: '2026-07-10',
      fecha_hasta: '2026-07-01',
    });
  });

  it('refetches when the Reintentar button is clicked', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResumen);

    renderDashboard();

    expect(
      await screen.findByText('Error al cargar datos'),
    ).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not exhaust the retry budget across independent filter searches', async () => {
    // The supervisor scenario: a loaded search then fails on retries, and
    // the user switches to a different filter (new queryKey). The retry
    // budget must reset per queryKey so the new independent search never
    // shows "Contactá al administrador" prematurely.
    mockFetch
      .mockResolvedValueOnce(mockResumen)
      .mockRejectedValue(new Error('Network error'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminMermasDashboard />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();

    // Refetch fails → stale-data banner with a Reintentar button.
    await act(async () => {
      queryClient.invalidateQueries();
    });
    expect(
      await screen.findByText(
        /No se pudieron cargar los datos para los filtros seleccionados/,
      ),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

    // Change a filter — this triggers a new query with a fresh queryKey.
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    // The new independent search still offers a retry button instead of
    // telling the user to contact the administrator.
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(
      screen.queryByText(/Contactá al administrador/),
    ).not.toBeInTheDocument();
  });

  it('shows the truncation notice when the detail reaches the limit', async () => {
    mockFetch.mockResolvedValue({
      agrupacion: 'mes' as const,
      total_general: 100,
      producto_mas_afectado: { nombre: 'Manzana', total: 100 },
      detalle: Array.from({ length: WASTE_DETAIL_LIMIT }, () => ({
        periodo: '2026-07-01T00:00:00-03:00',
        producto_nombre: 'Manzana',
        producto_id: 1,
        decision_nombre: 'tirar',
        decision_id: 1,
        total_cantidad: 1,
        total_mermas: 1,
      })),
    });

    renderDashboard();

    expect(await screen.findByText('Unidades mermadas')).toBeInTheDocument();
    expect(
      screen.getByText(
        `Mostrando los primeros ${WASTE_DETAIL_LIMIT} registros`,
      ),
    ).toBeInTheDocument();
  });
});
