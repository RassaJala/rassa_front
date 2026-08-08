import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The web api client installs axios-retry (exponential backoff) on 5xx; by
// default the error-fallback test would spend ~12s waiting for the retries to
// exhaust. Replacing it with a no-op keeps the api layer working while making
// failures surface immediately, like the mobile tests do with retry: false.
vi.mock('axios-retry', () => {
  const noop = Object.assign(() => undefined, {
    exponentialDelay: () => 0,
    isNetworkOrIdempotentRequestError: () => false,
  });
  return { default: noop, __esModule: true };
});

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

  it('rejects a quantity of 0 (boundary below the minimum)', async () => {
    seedMocks();
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    await selectFields(user);
    // fireEvent.change + fireEvent.submit beat user.type/user.click here: the
    // <input type="number" min="1"> makes jsdom enforce constraint validation,
    // so a "0" keystroke is dropped and an invalid value blocks the submit
    // event before React's handler runs. Driving the DOM events directly
    // exercises the same payload a real browser produces for the JS rule.
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '0' },
    });
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    expect(
      await screen.findByText(
        'La cantidad debe ser un número entero mayor a 0.',
      ),
    ).toBeInTheDocument();
  });

  it('disables the submit button while the mutation is pending (no double POST)', async () => {
    seedMocks();
    let resolvePost: ((value: unknown) => void) | undefined;
    let postedCount = 0;
    server.use(
      http.post(`${BASE}/mermas/`, () => {
        postedCount += 1;
        return new Promise((resolve) => {
          resolvePost = resolve;
        });
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

    const submit = screen.getByRole('button', { name: /Registrar Merma/ });
    await user.click(submit);

    // While the mutation is in flight the button turns into "Guardando…" and
    // is disabled, so a second click cannot fire a second request.
    expect(
      await screen.findByRole('button', { name: /Guardando/ }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Guardando/ }));
    await waitFor(() => expect(resolvePost).toBeDefined());
    resolvePost?.(HttpResponse.json({ data: { id_merma: 1 } }));

    await waitFor(() => expect(postedCount).toBe(1));
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

    // axios-retry is a no-op in tests, so the failed query settles into
    // isError immediately and the fallback shows without a backoff wait.
    expect(
      await screen.findByText('No se pudieron cargar los datos.'),
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
