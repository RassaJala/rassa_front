import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../providers/ThemeProvider';
import { server } from '../mocks/server';
import { LIQUIDACIONES } from '../mocks/fixtures';
import { AdminSettlements } from '../routes/AdminSettlements';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <AdminSettlements />
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  return qc;
}

const emptyLiquidaciones = () =>
  HttpResponse.json({
    ok: true,
    data: { count: 0, next: null, previous: null, results: [] },
  });

const fullLiquidaciones = () =>
  HttpResponse.json({
    ok: true,
    data: {
      count: LIQUIDACIONES.length,
      next: null,
      previous: null,
      results: LIQUIDACIONES,
    },
  });

describe('AdminSettlements — integration', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('renders the rows with formatted money and estado badges', async () => {
    renderPage();

    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
    expect(screen.getByText('$900.00')).toBeInTheDocument();
    // Page 1 holds ids 1–10, all pendiente.
    expect(screen.getAllByText('Pendiente')).toHaveLength(10);
    expect(screen.queryByText('Pagada')).not.toBeInTheDocument();
    expect(
      screen.getByText('Página 1 de 2 — 12 liquidaciones en total'),
    ).toBeInTheDocument();
  });

  it('shows the recomputed a-liquedar in the table when monto_liquidar is invalid (CONV-1 parity)', async () => {
    // The list must resolve amounts through the SAME resolver as the detail
    // screen: a malformed monto_liquidar renders the monto_ventas − comision
    // fallback (1000.00 − 100.00) instead of $0.00, keeping both surfaces
    // identical. R3-001: the derived amount is ALSO flagged "(estimado)" so the
    // list never presents it as authoritative server data.
    server.use(
      http.get('/api/liquidaciones/', () =>
        HttpResponse.json({
          ok: true,
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [{ ...LIQUIDACIONES[0]!, monto_liquidar: '' }],
          },
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText('$900.00')).toBeInTheDocument();
    expect(screen.getByText(/\(estimado\)/i)).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('refetches with the new query params when an estado chip is clicked', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Pagadas' }));

    expect(await screen.findByText('2 liquidaciones')).toBeInTheDocument();
    expect(screen.getAllByText('Pagada')).toHaveLength(2);
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('filters by farmer from the select', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Agricultor'), '2');

    // Farmer 2 owns ids 7–10 (pendiente) + 12 (pagada).
    expect(await screen.findByText('5 liquidaciones')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    expect(screen.getAllByText('María López')).toHaveLength(5);
  });

  it('clears the farmer filter when "Todos los agricultores" is selected again (JD-001)', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();

    // Filter by farmer 2 first so the select has a real selection.
    await user.selectOptions(screen.getByLabelText('Agricultor'), '2');
    expect(await screen.findByText('5 liquidaciones')).toBeInTheDocument();

    // Selecting the empty option must map to undefined, not 0. With the bug,
    // Number('') === 0 sends agricultor:0, the mock matches nothing and the
    // list empties — so seeing all 12 rows again proves the refetch was
    // unfiltered.
    const select = screen.getByLabelText('Agricultor');
    await user.selectOptions(
      select,
      screen.getByRole('option', { name: 'Todos los agricultores' }),
    );

    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();
    expect(select).toHaveValue('');
    expect(
      screen.queryByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).not.toBeInTheDocument();
  });

  it('applies the date range instantly and blocks an invalid range', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    // Hasta = 2026-06-30 keeps only the June settlements (ids 11–12).
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Fecha hasta'), {
        target: { value: '2026-06-30' },
      });
    });

    expect(await screen.findByText('2 liquidaciones')).toBeInTheDocument();
    expect(screen.getAllByText('Pagada')).toHaveLength(2);

    // Hasta < Desde blocks the query and shows the warning.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Fecha desde'), {
        target: { value: '2026-07-10' },
      });
    });

    expect(
      screen.getByText('La fecha «Hasta» debe ser mayor o igual a «Desde».'),
    ).toBeInTheDocument();
    // CRIT-2: an invalid range must NOT wipe the visible list — the previously
    // loaded rows stay rendered and the empty state does NOT replace them.
    expect(screen.getByText('2 liquidaciones')).toBeInTheDocument();
    expect(screen.getAllByText('Pagada')).toHaveLength(2);
    expect(
      screen.queryByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).not.toBeInTheDocument();
    // The explicit rango inválido hint is rendered next to the kept list.
    expect(
      screen.getByText(/rango de fechas es inválido/i),
    ).toBeInTheDocument();
  });

  it('does not report "no results" while the range is invalid (CRIT-2)', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    // A valid range that matches nothing legitimately shows the empty state.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Fecha hasta'), {
        target: { value: '2026-01-01' },
      });
    });
    expect(
      await screen.findByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).toBeInTheDocument();

    // Turning the range invalid must NOT show that empty state: the problem is
    // the dates, not the results.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Fecha desde'), {
        target: { value: '2026-07-10' },
      });
    });
    expect(
      screen.queryByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/rango de fechas es inválido/i),
    ).toBeInTheDocument();
  });

  it('shows an updating indicator while placeholder rows are being replaced (CONV-4)', async () => {
    // Gate the pagada response so the placeholder stays on screen long enough
    // to assert the indicator; the old rows remain visible but are clearly
    // marked as not-current while the refetch is in flight.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/api/liquidaciones/', ({ request }) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.searchParams.get('estado') === 'pagada') {
          return gate.then(() =>
            HttpResponse.json({
              ok: true,
              data: {
                count: 2,
                next: null,
                previous: null,
                results: LIQUIDACIONES.filter((s) => s.estado === 'pagada'),
              },
            }),
          );
        }
        return HttpResponse.json({
          ok: true,
          data: {
            count: LIQUIDACIONES.length,
            next: null,
            previous: null,
            results: LIQUIDACIONES,
          },
        });
      }),
    );
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Pagadas' }));

    // Placeholder keeps the stale rows visible, the indicator says the list is
    // not the current dataset.
    expect(await screen.findByText(/actualizando/i)).toBeInTheDocument();
    expect(screen.getByText('12 liquidaciones')).toBeInTheDocument();

    release?.();
    await screen.findByText('2 liquidaciones');
    expect(screen.queryByText(/actualizando/i)).not.toBeInTheDocument();
  });

  it('shows a persistent banner (not a toast) when a refetch fails after data was loaded (WARN-3)', async () => {
    let fail = false;
    server.use(
      http.get('/api/liquidaciones/', () =>
        fail
          ? HttpResponse.json(
              { ok: true, message: 'Error interno' },
              { status: 400 },
            )
          : fullLiquidaciones(),
      ),
    );
    const qc = renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    fail = true;
    await act(async () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
    });

    // The stale list stays visible under a persistent banner with a retry.
    expect(
      await screen.findByText(/Mostrando la última consulta exitosa/),
    ).toBeInTheDocument();
    expect(screen.getByText('12 liquidaciones')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with a reset hint and recovers on Limpiar filtros', async () => {
    let empty = false;
    server.use(
      http.get('/api/liquidaciones/', () =>
        empty ? emptyLiquidaciones() : fullLiquidaciones(),
      ),
    );
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();
    empty = true;
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Fecha desde'), {
        target: { value: '2026-07-01' },
      });
    });

    expect(
      await screen.findByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).toBeInTheDocument();

    empty = false;
    // The filter bar and the empty state both render a "Limpiar filtros"
    // button while filters are active — click the one inside the empty state.
    const buttons = screen.getAllByRole('button', { name: 'Limpiar filtros' });
    const resetHintButton = buttons[buttons.length - 1];
    if (!resetHintButton) throw new Error('Missing Limpiar filtros button');
    await user.click(resetHintButton);

    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();
  });

  it('shows the full error state with Reintentar when the fetch fails', async () => {
    let fail = true;
    server.use(
      http.get('/api/liquidaciones/', () => {
        if (fail) {
          fail = false;
          return HttpResponse.json(
            { ok: true, message: 'Error interno' },
            { status: 400 },
          );
        }
        return fullLiquidaciones();
      }),
    );
    renderPage();

    expect(
      await screen.findByText('Error al cargar liquidaciones'),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();
  });

  it('shows a truncation notice when the fetch hits the page cap (JD-003)', async () => {
    // The server keeps answering with a `next` link, so the fetch-all walk
    // stops at SETTLEMENTS_MAX_PAGES (20) with more pages pending. The UI
    // must say the list is partial instead of showing it as complete.
    server.use(
      http.get('/api/liquidaciones/', () =>
        HttpResponse.json({
          ok: true,
          data: {
            count: 1000,
            next: 'liquidaciones/?page=2',
            previous: null,
            results: [LIQUIDACIONES[0]],
          },
        }),
      ),
    );
    renderPage();

    // WARN-1: the notice is actionable — it reports the fetched count against
    // the server total and points at the filters to narrow the results.
    expect(
      await screen.findByText(
        'Mostrando las primeras 20 de 1000 liquidaciones.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aplica un filtro para acotar los resultados.'),
    ).toBeInTheDocument();
    expect(screen.getByText('20 liquidaciones')).toBeInTheDocument();
  });

  it('slices the list client-side and pages through with Anterior/Siguiente', async () => {
    renderPage();
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(
      await screen.findByText('Página 2 de 2 — 12 liquidaciones en total'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Pagada')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(
      await screen.findByText('Página 1 de 2 — 12 liquidaciones en total'),
    ).toBeInTheDocument();
  });

  it('shows no farmer options and still loads the list when the farmers fetch is empty (R2)', async () => {
    server.use(
      http.get('/api/admin/usuarios/', () =>
        HttpResponse.json({
          ok: true,
          data: { count: 0, next: null, previous: null, results: [] },
        }),
      ),
    );
    renderPage();

    // The settlements list loads unfiltered regardless of the empty farmers.
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();

    const select = screen.getByLabelText('Agricultor');
    expect(select).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Todos los agricultores')).toBeInTheDocument();
  });
});
