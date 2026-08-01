import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PEDIDO_45 } from '../../mocks/fixtures';
import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import {
  AMBIGUOUS_MARKER_KEY,
  CONCURRENT_CHECKOUT_MSG,
  readAmbiguousMarker,
  readPlacedOrder,
  writeAmbiguousMarker,
  writeInFlightCheckout,
} from '../../services/checkoutGuard';
import {
  AMBIGUOUS_LOG_MARKER,
  AMBIGUOUS_MSG,
  MALFORMED_RESPONSE_MSG,
  ORDER_ERROR_DEFAULT,
} from '../../services/orders';
import { useCartStore } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { INTERNAL_SERVER_HTML_MESSAGE } from '../../utils/apiErrors';
import { BuyerCart } from '../BuyerCart';
import { BuyerCheckout } from '../BuyerCheckout';

const AMBIGUOUS_ACK_LABEL = 'Ya revisé mis pedidos';

// Subtotal 25.00 → IVA 5.25 → Total 30.25 (spec R2 / IVA_RATE 0.21)
const CART_ITEMS: CartItem[] = [
  {
    id_producto_semanal: 1,
    producto: 'Tomate',
    unidad: 'kg',
    precio: 10,
    foto: null,
    agricultor: 'Juan Pérez',
    cantidad: 2,
    stock: 10,
  },
  {
    id_producto_semanal: 2,
    producto: 'Lechuga',
    unidad: 'unidad',
    precio: 5,
    foto: null,
    agricultor: 'Ana Gómez',
    cantidad: 1,
    stock: 10,
  },
];

function PedidoStub() {
  const { id } = useParams<{ id: string }>();
  return <div>Pedido detalle {id}</div>;
}

function renderCheckout() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter initialEntries={['/cliente/checkout']}>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/cliente/checkout" element={<BuyerCheckout />} />
            <Route path="/cliente/pedidos/:id" element={<PedidoStub />} />
          </Routes>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// Shared QueryClient so the MutationCache survives unmount/remount (C-1/R10).
function renderCheckoutWithClient(qc: QueryClient) {
  return render(
    <MemoryRouter initialEntries={['/cliente/checkout']}>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/cliente/checkout" element={<BuyerCheckout />} />
            <Route path="/cliente/pedidos/:id" element={<PedidoStub />} />
          </Routes>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function renderCart() {
  return render(
    <MemoryRouter initialEntries={['/cliente/carrito']}>
      <ThemeProvider>
        <Routes>
          <Route path="/cliente/carrito" element={<BuyerCart />} />
          <Route path="/cliente/checkout" element={<div>Checkout stub</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useCartStore.setState({ items: CART_ITEMS });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BuyerCheckout — integration', () => {
  it('R1: "Continuar compra" on the cart navigates to /cliente/checkout', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Continuar compra' }));

    expect(screen.getByText('Checkout stub')).toBeInTheDocument();
  });

  it('R2: shows item rows and Subtotal / IVA (21%) / Total with correct math', async () => {
    renderCheckout();

    expect(await screen.findByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Lechuga')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('IVA (21%)')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$5.25')).toBeInTheDocument();
    expect(screen.getByText('$30.25')).toBeInTheDocument();
  });

  it('R3: empty cart shows an empty state with catalog link and no confirm button', async () => {
    useCartStore.setState({ items: [] });
    renderCheckout();

    expect(
      await screen.findByText('Tu carrito está vacío'),
    ).toBeInTheDocument();
    const catalogLink = screen.getByRole('link', { name: 'Ir al catálogo' });
    expect(catalogLink.getAttribute('href')).toBe('/cliente/catalogo');
    expect(
      screen.queryByRole('button', { name: 'Confirmar pedido' }),
    ).not.toBeInTheDocument();
  });

  it('R4: confirm sends the exact payload and disables the button while pending', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    let capturedBody: unknown;
    server.use(
      http.post('/api/pedidos/', async ({ request }) => {
        postCount += 1;
        capturedBody = await request.json();
        return deferred;
      }),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    const pendingBtn = screen.getByRole('button', {
      name: 'Procesando pedido…',
    });
    expect(pendingBtn).toBeDisabled();
    expect(postCount).toBe(1);

    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(capturedBody).toEqual({
      items: [
        { id_producto_semanal: 1, cantidad: 2 },
        { id_producto_semanal: 2, cantidad: 1 },
      ],
    });
  });

  it('R9: double-click while the order is in flight sends exactly one POST', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');

    const confirmBtn = screen.getByRole('button', {
      name: 'Confirmar pedido',
    });
    await user.click(confirmBtn);
    await user.click(confirmBtn);

    expect(postCount).toBe(1);

    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(await screen.findByText('Pedido detalle 45')).toBeInTheDocument();
  });

  it('R10: navigate-away-and-return during a pending POST does not duplicate the order and the cart clears on resolve', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    // The MutationCache must survive unmount/remount, so the QueryClient is
    // shared across the two mounts (same cache → pending mutation detected).
    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const renderCheckoutWithClient = () =>
      render(
        <MemoryRouter initialEntries={['/cliente/checkout']}>
          <ThemeProvider>
            <QueryClientProvider client={qc}>
              <Routes>
                <Route path="/cliente/checkout" element={<BuyerCheckout />} />
              </Routes>
            </QueryClientProvider>
          </ThemeProvider>
        </MemoryRouter>,
      );

    const user = userEvent.setup();

    // First mount: confirm → first POST in flight.
    const first = renderCheckoutWithClient();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // Navigate away while the POST is still pending.
    first.unmount();

    // Return: the remounted observer starts idle, but the MutationCache still
    // holds the pending order mutation — the button must stay disabled and a
    // second confirm must not issue a second POST.
    const second = renderCheckoutWithClient();
    const pendingBtn = await screen.findByRole('button', {
      name: 'Procesando pedido…',
    });
    expect(pendingBtn).toBeDisabled();
    await user.click(pendingBtn);
    expect(postCount).toBe(1);

    // Navigate away again and let the first POST resolve while unmounted: the
    // mutation-level onSuccess must still clear the cart.
    second.unmount();
    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(postCount).toBe(1);

    // Returning now shows the empty cart — the same order cannot be confirmed
    // a second time.
    renderCheckoutWithClient();
    expect(
      await screen.findByText('Tu carrito está vacío'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Confirmar pedido' }),
    ).not.toBeInTheDocument();
  });

  it('R5: success clears the cart and navigates to /cliente/pedidos/45', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Pedido detalle 45')).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('R6a: 400 top-level string-array body shows actionable text and preserves cart', async () => {
    server.use(
      http.post('/api/pedidos/', () =>
        HttpResponse.json(
          ["Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5."],
          { status: 400 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText(
        "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(ORDER_ERROR_DEFAULT)).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('R6b: 400 object body { detail } shows actionable text and preserves cart', async () => {
    server.use(
      http.post('/api/pedidos/', () =>
        HttpResponse.json({ detail: 'Stock insuficiente' }, { status: 400 }),
      ),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
    expect(screen.queryByText(ORDER_ERROR_DEFAULT)).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('R7: network failure shows the ambiguous message and preserves cart', async () => {
    server.use(http.post('/api/pedidos/', () => HttpResponse.error()));

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('R8: 500 HTML/traceback body shows sanitized generic error and preserves cart', async () => {
    server.use(
      http.post('/api/pedidos/', () =>
        HttpResponse.text(
          '<html><body><pre>Traceback (most recent call last):\n  File "/app/views.py", line 42, in post\n    raise IntegrityError</pre></body></html>',
          { status: 500 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText(INTERNAL_SERVER_HTML_MESSAGE),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Traceback/)).not.toBeInTheDocument();
    expect(screen.queryByText('<html>')).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('C-1(a): an ambiguous failure while mounted shows the warning banner and persists the marker', async () => {
    server.use(http.post('/api/pedidos/', () => HttpResponse.error()));

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(readAmbiguousMarker()).not.toBeNull();
    // No navigation, cart preserved — the failure was surfaced BEFORE any
    // blind re-confirmation could happen.
    expect(screen.queryByText(/Pedido detalle/)).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('C-1: dismissing the banner clears the marker and hides the warning', async () => {
    server.use(http.post('/api/pedidos/', () => HttpResponse.error()));

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText(AMBIGUOUS_MSG);

    await user.click(screen.getByRole('button', { name: AMBIGUOUS_ACK_LABEL }));

    expect(screen.queryByText(AMBIGUOUS_MSG)).not.toBeInTheDocument();
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('C-1(b): an ambiguous failure that resolves after unmount surfaces as a warning banner on remount', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const user = userEvent.setup();
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // Navigate away while the POST is still pending; the POST then fails
    // ambiguously — the marker must be persisted by the mutation-level error
    // handler even though no component is mounted.
    first.unmount();
    resolveOrder(HttpResponse.error());

    await waitFor(() => {
      expect(readAmbiguousMarker()).not.toBeNull();
    });

    // Returning shows the warning banner instead of a blind re-confirm.
    renderCheckoutWithClient(qc);
    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('JD-A-002: the ambiguous marker is written BEFORE the POST is dispatched', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    // Records the order of marker persistence vs. POST dispatch.
    let markerAtPostDispatch: boolean | null = null;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    server.use(
      http.post('/api/pedidos/', () => {
        markerAtPostDispatch = readAmbiguousMarker() !== null;
        return deferred;
      }),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    // The marker is already persisted while the POST is still pending — only a
    // write that happened BEFORE mutation.mutate() can explain this (onError
    // has not run yet).
    expect(readAmbiguousMarker()).not.toBeNull();
    const markerWrites = setItemSpy.mock.calls.filter(
      ([key]) => key === AMBIGUOUS_MARKER_KEY,
    );
    expect(markerWrites.length).toBeGreaterThan(0);
    // Invocation order: by the time the POST is dispatched, the marker is
    // already visible — so a hard reload while pending still surfaces it.
    expect(markerAtPostDispatch).toBe(true);

    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  it('JD-A-001: an ambiguous failure resolving after a remount-while-pending surfaces the banner on the live instance', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const user = userEvent.setup();
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // Navigate away and return while the POST is still pending. The remounted
    // observer starts idle and never attaches to the in-flight mutation, so
    // the original mount's callbacks (including its setAmbiguousMarker) cannot
    // update this live instance when the POST settles.
    first.unmount();
    renderCheckoutWithClient(qc);
    const pendingBtn = await screen.findByRole('button', {
      name: 'Procesando pedido…',
    });
    expect(pendingBtn).toBeDisabled();

    // The pending POST now fails ambiguously. The banner must appear on the
    // live instance — never a silent re-enabled button that invites a blind
    // re-confirm and a duplicate order.
    resolveOrder(HttpResponse.error());

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('JD-A-001: dismissing the banner while pending does not hide a later ambiguous resolution', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const user = userEvent.setup();
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // Remount while pending: the marker written before the POST makes the
    // warning visible immediately.
    first.unmount();
    renderCheckoutWithClient(qc);
    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();

    // The user acknowledges the warning while the POST is still pending — the
    // marker is cleared. When the POST then settles ambiguously, the mutation
    // onError (captured from the first mount) re-writes the marker but its
    // setState cannot reach the live instance: the settle-time re-read must
    // restore the banner instead of silently re-enabling the button.
    await user.click(screen.getByRole('button', { name: AMBIGUOUS_ACK_LABEL }));
    expect(screen.queryByText(AMBIGUOUS_MSG)).not.toBeInTheDocument();
    expect(readAmbiguousMarker()).toBeNull();

    resolveOrder(HttpResponse.error());

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(readAmbiguousMarker()).not.toBeNull();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('C-1(c1): the marker is cleared on confirmed success', async () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'stale' });

    const user = userEvent.setup();
    renderCheckout();
    // A prior ambiguous failure is surfaced on mount.
    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Pedido detalle 45')).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('C-1(c2): the marker is cleared on a definitive failure', async () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'stale' });
    server.use(
      http.post('/api/pedidos/', () =>
        HttpResponse.json({ detail: 'Stock insuficiente' }, { status: 400 }),
      ),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText(AMBIGUOUS_MSG);

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
    expect(readAmbiguousMarker()).toBeNull();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('W-3: a malformed 2xx body is a definitive error — no navigation, cart kept', async () => {
    server.use(http.post('/api/pedidos/', () => HttpResponse.json({})));

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(MALFORMED_RESPONSE_MSG)).toBeInTheDocument();
    expect(screen.queryByText(/Pedido detalle/)).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('W-2: an out-of-range persisted quantity is skipped from the payload with a validation message', async () => {
    useCartStore.setState({
      items: [
        ...CART_ITEMS,
        {
          id_producto_semanal: 3,
          producto: 'Zanahoria',
          unidad: 'kg',
          precio: 8,
          foto: null,
          agricultor: 'Luis Díaz',
          cantidad: 99,
          stock: 10,
        },
      ],
    });
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let capturedBody: unknown;
    server.use(
      http.post('/api/pedidos/', async ({ request }) => {
        capturedBody = await request.json();
        return deferred;
      }),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    // The validation message is visible while the POST is still pending (the
    // checkout is still mounted — navigation has not happened yet).
    expect(
      await screen.findByText(/Cantidad inválida en: Zanahoria/),
    ).toBeInTheDocument();

    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(capturedBody).toEqual({
      items: [
        { id_producto_semanal: 1, cantidad: 2 },
        { id_producto_semanal: 2, cantidad: 1 },
      ],
    });
  });

  it('S-10: two synchronous submits in the same tick send exactly one POST', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    renderCheckout();
    await screen.findByText('Confirmar pedido');

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar pedido' });
    // Both clicks run inside a single act batch: React cannot re-render
    // between them, so a state-based guard would let both through. Only a
    // synchronous in-flight ref can block the second POST.
    act(() => {
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(postCount).toBe(1);
    });
    // Give a stray second POST a chance to arrive — it must not.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(postCount).toBe(1);

    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  it('W-4: sends a stable Idempotency-Key header, reused across retries of the same attempt', async () => {
    const keys: (string | null)[] = [];
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', async ({ request }) => {
        postCount += 1;
        keys.push(request.headers.get('Idempotency-Key'));
        if (postCount === 1) return HttpResponse.error();
        return HttpResponse.json({ data: PEDIDO_45 });
      }),
    );

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');

    // First attempt fails ambiguously (network error, no response).
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText(AMBIGUOUS_MSG);
    expect(postCount).toBe(1);
    expect(keys[0]).toMatch(/^checkout-/);

    // Re-confirm after the ambiguous failure: SAME attempt, SAME payload →
    // the idempotency key must be stable so a server-side dedupe can collapse
    // the two POSTs into one order.
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText('Pedido detalle 45');

    expect(postCount).toBe(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('S-3: a success resolving after navigate-away surfaces a confirmation notification on the next checkout mount', async () => {
    let resolveOrder!: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveOrder = resolve;
    });
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return deferred;
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const user = userEvent.setup();
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // Navigate away while the POST is pending; it then resolves successfully —
    // the cart is cleared silently and the user is left on another page.
    first.unmount();
    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    // Returning to checkout must NOT show a silent empty cart: the success
    // notification is surfaced, then consumed (cleared from storage).
    renderCheckoutWithClient(qc);
    expect(
      await screen.findByText(/Tu pedido N°45 se confirmó/),
    ).toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();
  });

  it('S-9: a checkout POST in flight from another tab blocks confirmation with a warning', async () => {
    let postCount = 0;
    server.use(
      http.post('/api/pedidos/', () => {
        postCount += 1;
        return HttpResponse.json({ data: PEDIDO_45 });
      }),
    );
    // Simulate another tab: an in-flight checkout record with a foreign tab
    // session id and a fresh timestamp.
    writeInFlightCheckout({
      tabSessionId: 'tab-A',
      idempotencyKey: 'checkout-other-tab',
      timestamp: Date.now(),
      fingerprint: 'foreign-payload',
    });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText(CONCURRENT_CHECKOUT_MSG),
    ).toBeInTheDocument();
    // The block must happen BEFORE the POST — no request may leave this tab.
    expect(postCount).toBe(0);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('S-11: an ambiguous failure is logged with a stable marker and the persisted marker payload', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.post('/api/pedidos/', () => HttpResponse.error()));

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText(AMBIGUOUS_MSG);

    const ambiguousCalls = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes(AMBIGUOUS_LOG_MARKER),
    );
    expect(ambiguousCalls.length).toBeGreaterThan(0);
    // The structured log must carry the persisted marker so an operator can
    // correlate the log line with the stored ambiguous record.
    const payload = ambiguousCalls[0]?.[2] as
      Record<string, unknown> | undefined;
    expect(payload?.marker).toEqual(readAmbiguousMarker());
  });
});
