import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from '../providers/ThemeProvider';
import { server } from '../mocks/server';
import {
  LIQUIDACION_DETAIL_PENDIENTE,
  MARCAR_PAGADA_SUCCESS_RESPONSE,
  YA_PAGADA_RESPONSE,
} from '../mocks/fixtures';
import { AdminSettlementDetail } from '../routes/AdminSettlementDetail';
import { fetchSettlements } from '../services/settlements';

// Probe that listens to the ['settlements'] query key — proves the mutation
// invalidates the list on BOTH success and error paths (R3-001).
let probeFetches = 0;
function SettlementsProbe() {
  useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      probeFetches += 1;
      return fetchSettlements();
    },
  });
  return <span>probe:{probeFetches}</span>;
}

function renderDetail(id: number, withProbe = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[`/admin/liquidaciones/${id}`]}>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          {withProbe ? <SettlementsProbe /> : null}
          <Routes>
            <Route
              path="/admin/liquidaciones/:id"
              element={<AdminSettlementDetail />}
            />
          </Routes>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function openPagarModal() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Marcar como pagada' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  return user;
}

describe('AdminSettlementDetail — integration', () => {
  it('renders the breakdown with formatted money and the ventas list (pendiente)', async () => {
    renderDetail(1);

    expect(await screen.findByText('Desglose')).toBeInTheDocument();
    expect(screen.getByText('Monto de ventas')).toBeInTheDocument();
    expect(screen.getByText('Comisión Rassa (10%)')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$900.00')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    expect(screen.getByText('Ventas del periodo')).toBeInTheDocument();
    expect(screen.getByText('Pedido #5')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText('Pedido #6')).toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Folio P-2026-0001')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Marcar como pagada' }),
    ).toBeInTheDocument();
  });

  it('renders the pago card and hides the action when already paid', async () => {
    renderDetail(11);

    expect(await screen.findByText('Pago registrado')).toBeInTheDocument();
    expect(screen.getByText('LQ-2026-0011')).toBeInTheDocument();
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.getByText('$450.00')).toBeInTheDocument();
    expect(screen.getByText('REF-2026-011')).toBeInTheDocument();
    expect(screen.getByText('Pagada')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Marcar como pagada' }),
    ).not.toBeInTheDocument();
  });

  it('keeps Confirmar pago disabled while there is no payment type', async () => {
    server.use(http.get('/api/tipos-pago/', () => HttpResponse.json([])));
    renderDetail(1);
    await screen.findByText('Desglose');

    await openPagarModal();

    expect(
      screen.getByRole('button', { name: 'Confirmar pago' }),
    ).toBeDisabled();
  });

  it('posts the marcar-pagada body, shows the success toast and invalidates the list', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('/api/liquidaciones/1/marcar-pagada/', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(MARCAR_PAGADA_SUCCESS_RESPONSE);
      }),
    );
    probeFetches = 0;
    renderDetail(1, true);
    expect(await screen.findByText('probe:1')).toBeInTheDocument();

    const user = await openPagarModal();
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Tipo de pago'), '2');
    await user.type(screen.getByLabelText('Referencia (opcional)'), 'REF-123');
    await user.click(screen.getByRole('button', { name: 'Confirmar pago' }));

    await waitFor(() => {
      expect(capturedBody).toEqual({ tipo_pago: 2, referencia: 'REF-123' });
    });
    expect(
      await screen.findByText('Liquidación marcada como pagada'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // onSuccess invalidated ['settlements'] → the probe refetched.
    await waitFor(() => {
      expect(screen.getByText('probe:2')).toBeInTheDocument();
    });
  });

  it('treats the idempotent 200 ya-pagada as success: server message toasts and the list invalidates', async () => {
    // The detail view is stale (still pendiente) but the server answers the
    // already-paid id 11 with the idempotent 200 — R4 must treat it as success.
    server.use(
      http.get('/api/liquidaciones/11/', () =>
        HttpResponse.json({ ok: true, data: LIQUIDACION_DETAIL_PENDIENTE }),
      ),
    );
    probeFetches = 0;
    renderDetail(11, true);
    expect(await screen.findByText('probe:1')).toBeInTheDocument();

    const user = await openPagarModal();
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar pago' }));

    // No POST override: the default handler answers id 11 with
    // YA_PAGADA_RESPONSE (200), so the fixture message surfaces as a toast.
    expect(
      await screen.findByText(YA_PAGADA_RESPONSE.message),
    ).toBeInTheDocument();
    // onSuccess invalidated ['settlements'] → the probe refetched.
    await waitFor(() => {
      expect(screen.getByText('probe:2')).toBeInTheDocument();
    });
  });

  it('shows the error toast and invalidates the list on a 409 business error', async () => {
    server.use(
      http.post('/api/liquidaciones/1/marcar-pagada/', () =>
        HttpResponse.json(
          { ok: true, message: 'La liquidación ya fue pagada' },
          { status: 409 },
        ),
      ),
    );
    probeFetches = 0;
    renderDetail(1, true);
    expect(await screen.findByText('probe:1')).toBeInTheDocument();

    const user = await openPagarModal();
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar pago' }));

    // Local error line in the modal + the error toast (dedup → findAllByText).
    expect(
      (await screen.findAllByText('La liquidación ya fue pagada')).length,
    ).toBeGreaterThanOrEqual(1);
    // onError also invalidated ['settlements'] → the probe refetched.
    await waitFor(() => {
      expect(screen.getByText('probe:2')).toBeInTheDocument();
    });
  });

  it('shows the stale-data banner when a refetch fails after data was loaded', async () => {
    let fail = false;
    server.use(
      http.get('/api/liquidaciones/1/', () => {
        if (fail) {
          // 4xx fails fast: the shared axios instance retries 5xx with
          // exponential backoff, which would outlast the assertion timeout.
          return HttpResponse.json(
            { ok: true, message: 'Error interno' },
            { status: 400 },
          );
        }
        return HttpResponse.json({
          ok: true,
          data: LIQUIDACION_DETAIL_PENDIENTE,
        });
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={['/admin/liquidaciones/1']}>
        <ThemeProvider>
          <QueryClientProvider client={qc}>
            <Routes>
              <Route
                path="/admin/liquidaciones/:id"
                element={<AdminSettlementDetail />}
              />
            </Routes>
          </QueryClientProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Desglose')).toBeInTheDocument();

    fail = true;
    await act(async () => {
      qc.invalidateQueries({ queryKey: ['settlement', 1] });
    });

    expect(
      await screen.findByText(
        'No se pudieron cargar los datos. Mostrando la última consulta exitosa.',
      ),
    ).toBeInTheDocument();
    // Data is kept while the refetch failed.
    expect(screen.getByText('Desglose')).toBeInTheDocument();
  });
});
