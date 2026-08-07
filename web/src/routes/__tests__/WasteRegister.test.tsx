import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { WasteRegister } from '../WasteRegister';

const BASE = '/api';

const pedidos = [
  {
    id_pedido: 1,
    cliente_nombre: 'Juan Pérez',
    total: '120',
    estado_actual: 'pendiente',
    creado_en: '2026-08-03T00:00:00-03:00',
  },
  {
    id_pedido: 2,
    cliente_nombre: 'María Gómez',
    total: '80',
    estado_actual: 'entregado',
    creado_en: '2026-08-02T00:00:00-03:00',
  },
];

const publications = [
  {
    id_publicacion: 10,
    agricultor: null,
    fecha_publicacion: '2026-08-03T00:00:00-03:00',
    semana: '2026-W32',
    productos: [
      {
        id_producto_semanal: 100,
        producto: 'Tomate',
        unidad: 'kg',
        stock: 5,
        precio: '120',
        foto: '',
      },
    ],
  },
];

function seedMocks() {
  server.use(
    http.get(`${BASE}/pedidos/`, () => HttpResponse.json({ results: pedidos })),
    http.get(`${BASE}/publicaciones/current/`, () =>
      HttpResponse.json({ data: publications }),
    ),
  );
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <WasteRegister />
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function selectFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^Pedido/), '1');
  await user.selectOptions(screen.getByLabelText(/Producto publicado/), '100');
  await user.selectOptions(screen.getByLabelText(/Decisión/), '1');
}

function seedPostSuccess() {
  server.use(
    http.post(`${BASE}/mermas/`, () =>
      HttpResponse.json({ data: { id_merma: 1 } }),
    ),
  );
}

describe('WasteRegister', () => {
  it('renders the form with products and the fixed decision options', async () => {
    seedMocks();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Registrar Merma' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Tomate/ })).toBeTruthy();
    expect(
      screen.getByRole('option', { name: /Elige una decisión/ }),
    ).toBeTruthy();
  });

  it('shows validation errors when required fields are missing', async () => {
    seedMocks();
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));

    expect(
      await screen.findByText('Selecciona un pedido.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Selecciona un producto publicado.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('La cantidad debe ser un número entero mayor a 0.'),
    ).toBeInTheDocument();
    expect(screen.getByText('El motivo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Elige una decisión.')).toBeInTheDocument();
  });

  it('accepts a quantity equal to the stock and rejects one above it', async () => {
    seedMocks();
    seedPostSuccess();
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    await selectFields(user);

    // boundary: 5 == stock passes validation
    await user.type(screen.getByPlaceholderText('0'), '5');
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));
    expect(
      await screen.findByText('Merma registrada correctamente.'),
    ).toBeInTheDocument();

    // boundary: 6 > stock is rejected before submit (unmount the previous
    // render so the second page instance is the only one in the DOM)
    cleanup();
    renderPage();
    await screen.findByRole('option', { name: /Tomate/ });
    await selectFields(user);
    await user.type(screen.getByPlaceholderText('0'), '6');
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));
    expect(await screen.findByText('Stock disponible: 5.')).toBeInTheDocument();
  });

  it('posts the record and invalidates the products query on success', async () => {
    seedMocks();
    let postedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${BASE}/mermas/`, async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id_merma: 1 } });
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    await selectFields(user);
    await user.type(screen.getByPlaceholderText('0'), '2');
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));

    await waitFor(() => expect(postedBody).not.toBeNull());
    expect(postedBody).toMatchObject({
      fk_producto_semanal: 100,
      fk_pedido: 1,
      cantidad: 2,
      motivo: 'Se venció',
      fk_decision: 1,
    });
    expect(
      await screen.findByText('Merma registrada correctamente.'),
    ).toBeInTheDocument();
  });

  it('excludes terminal orders from the pedido selector', async () => {
    seedMocks();
    renderPage();

    await screen.findByRole('option', { name: /Pedido #1 · Juan Pérez/ });
    expect(
      screen.queryByRole('option', { name: /Pedido #2 · María Gómez/ }),
    ).toBeNull();
  });

  it('shows the loading spinner while queries are in flight', async () => {
    seedMocks();
    renderPage();

    expect(
      screen.getByRole('status', { name: /Cargando/ }),
    ).toBeInTheDocument();
    // resolves once the queries land
    expect(await screen.findByRole('option', { name: /Tomate/ })).toBeTruthy();
  });

  it('shows the empty product notice when there are no publications', async () => {
    server.use(
      http.get(`${BASE}/pedidos/`, () =>
        HttpResponse.json({ results: pedidos }),
      ),
      http.get(`${BASE}/publicaciones/current/`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    renderPage();
    const user = userEvent.setup();

    expect(
      await screen.findByText(/No hay publicaciones activas esta semana/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));
    expect(
      await screen.findByText('Selecciona un producto publicado.'),
    ).toBeInTheDocument();
  });

  it('shows the error fallback UI and recovers with Reintentar when queries fail', async () => {
    server.use(
      http.get(`${BASE}/pedidos/`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
      http.get(`${BASE}/publicaciones/current/`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();

    // The web api client applies axios-retry (exponential backoff) on 5xx
    // before the query settles into isError, so give the fallback time to
    // appear after the retries are exhausted.
    expect(
      await screen.findByText('No se pudieron cargar los datos.', undefined, {
        timeout: 12_000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reintentar/ }),
    ).toBeInTheDocument();

    // Reintentar refetches; the seed now succeeds so the form appears.
    server.use(
      http.get(`${BASE}/pedidos/`, () =>
        HttpResponse.json({ results: pedidos }),
      ),
      http.get(`${BASE}/publicaciones/current/`, () =>
        HttpResponse.json({ data: publications }),
      ),
    );
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByRole('option', { name: /Tomate/ })).toBeTruthy();
  });
});
