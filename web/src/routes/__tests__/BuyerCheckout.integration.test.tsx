import { StrictMode, type ReactNode } from 'react';
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
  IDEMPOTENCY_KEY_KEY,
  IN_FLIGHT_CHECKOUT_KEY,
  PLACED_ORDER_KEY,
  clearInFlightCheckout,
  readAmbiguousMarker,
  readInFlightCheckout,
  readPlacedOrder,
  writeAmbiguousMarker,
  writeInFlightCheckout,
  writePlacedOrder,
} from '../../services/checkoutGuard';
import {
  AMBIGUOUS_LOG_MARKER,
  AMBIGUOUS_MSG,
  ORDER_ERROR_DEFAULT,
} from '../../services/orders';
import { useCartStore } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { INTERNAL_SERVER_HTML_MESSAGE } from '../../utils/apiErrors';
import { BuyerCart } from '../BuyerCart';
import { BuyerCheckout } from '../BuyerCheckout';

// WARNING 2: the REAL ThemeProvider reads localStorage in its own useState
// initializer without a guard, so it cannot mount while the storage property
// getters throw. These tests target BuyerCheckout's resilience — replace the
// provider with a passthrough that still provides the theme context.
vi.mock('../../providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    resolved: 'light',
    setTheme: () => {},
    toggle: () => {},
  }),
}));

const AMBIGUOUS_ACK_LABEL = 'Ya revisé mis pedidos';
// Mirrors the module-local constants in BuyerCheckout (UI copy, Spanish voseo).
const AMBIGUOUS_BLOCK_MSG = 'Revisá tus pedidos antes de confirmar de nuevo.';
const WRITE_FAILED_MSG =
  'No se pudo guardar el estado del pedido. Intentá de nuevo.';

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

interface StubOrderOptions {
  /** Response body (defaults to a successful order envelope). */
  body?: unknown;
  /** HTTP status code for the response (default 200). */
  status?: number;
  /** Respond with raw text (e.g. an HTML traceback) instead of JSON. */
  text?: boolean;
  /** Simulate a network-level failure — no response reaches the client. */
  fail?: boolean;
  /** Hold the response open until the returned resolver is called. */
  deferred?: boolean;
  /** Runs on every POST with the parsed JSON body (counting/capturing). */
  onRequest?: (body: unknown) => void;
}

/**
 * Installs a POST /api/pedidos/ stub. With `deferred: true` the response is
 * held open — call the returned resolver to flush it.
 */
function stubCreateOrder(
  options: StubOrderOptions = {},
): (value: Response) => void {
  const { body, status, text, fail, deferred, onRequest } = options;
  let resolveOrder: (value: Response) => void = () => {};
  const pending: Promise<Response> | null = deferred
    ? new Promise((resolve) => {
        resolveOrder = resolve;
      })
    : null;
  const init = status === undefined ? undefined : { status };
  server.use(
    http.post('/api/pedidos/', async ({ request }) => {
      const parsedBody: unknown = await request.json().catch(() => undefined);
      onRequest?.(parsedBody);
      if (fail) return HttpResponse.error();
      if (pending) return pending;
      if (text) return HttpResponse.text(String(body), init);
      return HttpResponse.json(body ?? { data: PEDIDO_45 }, init);
    }),
  );
  return resolveOrder;
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
    let postCount = 0;
    let capturedBody: unknown;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: (body) => {
        postCount += 1;
        capturedBody = body;
      },
    });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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
    stubCreateOrder({
      status: 400,
      body: ["Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5."],
    });

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
    stubCreateOrder({ status: 400, body: { detail: 'Stock insuficiente' } });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
    expect(screen.queryByText(ORDER_ERROR_DEFAULT)).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('R7: network failure shows the ambiguous message and preserves cart', async () => {
    stubCreateOrder({ fail: true });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('R8: 500 HTML/traceback body shows sanitized generic error and preserves cart', async () => {
    stubCreateOrder({
      status: 500,
      text: true,
      body: '<html><body><pre>Traceback (most recent call last):\n  File "/app/views.py", line 42, in post\n    raise IntegrityError</pre></body></html>',
    });

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
    stubCreateOrder({ fail: true });

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
    stubCreateOrder({ fail: true });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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
    // Records the order of marker persistence vs. POST dispatch.
    let markerAtPostDispatch: boolean | null = null;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        markerAtPostDispatch = readAmbiguousMarker() !== null;
      },
    });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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

  it('C-1(c1): a marker written during the attempt is cleared on confirmed success', async () => {
    const resolveOrder = stubCreateOrder({ deferred: true });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    // The marker is persisted BEFORE the POST (JD-A-002) — still pending here.
    expect(readAmbiguousMarker()).not.toBeNull();

    // …and the confirmed success clears it.
    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));
    expect(await screen.findByText('Pedido detalle 45')).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('C-1(c2): the marker is cleared on a definitive failure', async () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'stale' });
    stubCreateOrder({ status: 400, body: { detail: 'Stock insuficiente' } });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText(AMBIGUOUS_MSG);

    // W-2: an unresolved marker blocks confirm — acknowledge it first.
    await user.click(screen.getByRole('button', { name: AMBIGUOUS_ACK_LABEL }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
    expect(readAmbiguousMarker()).toBeNull();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('W-3: a malformed 2xx body is AMBIGUOUS — banner, marker kept, key retained, cart preserved', async () => {
    stubCreateOrder({ body: {} });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    // The server accepted the request but the envelope is unusable — the order
    // may exist. The ambiguous banner (not a definitive error toast) must show,
    // the marker must survive, the idempotency key must NOT be cleared, and the
    // cart must be preserved so the user can verify before re-confirming.
    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(screen.queryByText(/Pedido detalle/)).not.toBeInTheDocument();
    expect(readAmbiguousMarker()).not.toBeNull();
    expect(window.localStorage.getItem(IDEMPOTENCY_KEY_KEY)).not.toBeNull();
    expect(useCartStore.getState().items).toHaveLength(2);
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
    let capturedBody: unknown;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: (body) => {
        capturedBody = body;
      },
    });

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
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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

    // W-2: acknowledge the ambiguous banner before re-confirming.
    await user.click(screen.getByRole('button', { name: AMBIGUOUS_ACK_LABEL }));

    // Re-confirm after the ambiguous failure: SAME attempt, SAME payload →
    // the idempotency key must be stable so a server-side dedupe can collapse
    // the two POSTs into one order.
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText('Pedido detalle 45');

    expect(postCount).toBe(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('W-2: an unresolved ambiguous marker BLOCKS re-confirmation until acknowledged', async () => {
    let postCount = 0;
    stubCreateOrder({
      fail: true,
      onRequest: () => {
        postCount += 1;
      },
    });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText(AMBIGUOUS_MSG);
    expect(postCount).toBe(1);

    // Re-confirm without acknowledging the ambiguous outcome: blocked — a
    // blind re-confirm could create a duplicate order.
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(AMBIGUOUS_BLOCK_MSG)).toBeInTheDocument();
    expect(postCount).toBe(1);

    // Acknowledge, then re-confirm: the POST goes out.
    await user.click(screen.getByRole('button', { name: AMBIGUOUS_ACK_LABEL }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => {
      expect(postCount).toBe(2);
    });
  });

  it('W-4: write-then-verify — a foreign record landing between check and write aborts with no POST', async () => {
    let postCount = 0;
    stubCreateOrder({
      onRequest: () => {
        postCount += 1;
      },
    });

    // Interleave: whenever OUR in-flight write lands, a foreign tab's record
    // lands instead (the race between hasConcurrentCheckout and the write).
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === IN_FLIGHT_CHECKOUT_KEY) {
        originalSetItem.call(
          this,
          key,
          JSON.stringify({
            tabSessionId: 'tab-FOREIGN',
            idempotencyKey: 'checkout-foreign',
            timestamp: Date.now(),
            fingerprint: 'foreign',
          }),
        );
        return;
      }
      originalSetItem.call(this, key, value);
    });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText(CONCURRENT_CHECKOUT_MSG),
    ).toBeInTheDocument();
    // The abort must happen BEFORE the POST — no request may leave this tab.
    expect(postCount).toBe(0);
    // The abort resets the in-flight flag — the button is not left dead.
    expect(
      screen.getByRole('button', { name: 'Confirmar pedido' }),
    ).not.toBeDisabled();
    expect(useCartStore.getState().items).toHaveLength(2);
    // JD-A-001/JD-B-002: the pre-POST marker write is rolled back on the abort
    // — no POST left this tab, so no false ambiguous state may survive for the
    // next checkout mount.
    expect(readAmbiguousMarker()).toBeNull();
    // R4-follow-up (WARNING 1): the stored record is the WINNER tab's real
    // in-flight record — it passed its own write-then-verify and is about to
    // POST. Clearing it here would void the S-9 cross-tab guard for the whole
    // duration of the winner's POST (duplicate-order window). The record must
    // survive: the winner's onSettled/onError clears its own record, and the
    // TTL in readInFlightCheckout covers a crashed tab.
    expect(readInFlightCheckout()?.tabSessionId).toBe('tab-FOREIGN');
    expect(postCount).toBe(0);
  });

  it('W-7: a storage write failure aborts the confirm with a toast, no POST, and a re-enabled button', async () => {
    let postCount = 0;
    stubCreateOrder({
      onRequest: () => {
        postCount += 1;
      },
    });
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      // JD-A-001/JD-B-002: only the in-flight write fails — the marker write
      // SUCCEEDS, reproducing the partial-write abort path (marker persisted,
      // POST never fired). The abort must roll the marker back.
      if (key === IN_FLIGHT_CHECKOUT_KEY) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(WRITE_FAILED_MSG)).toBeInTheDocument();
    expect(postCount).toBe(0);
    const confirmBtn = screen.getByRole('button', {
      name: 'Confirmar pedido',
    });
    expect(confirmBtn).not.toBeDisabled();
    // A second click retries (and fails the same way) — the button never dies.
    await user.click(confirmBtn);
    expect(postCount).toBe(0);
    expect(
      screen.getByRole('button', { name: 'Confirmar pedido' }),
    ).not.toBeDisabled();
    // JD-A-001/JD-B-002: the marker write that succeeded before the failing
    // write is rolled back — no POST left this tab, so no false ambiguous
    // state may survive for the next checkout mount.
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('JD-A-002/JD-B-001: a storage throw in the hidden-success onSuccess still clears the cart and leaves no duplicate-order window', async () => {
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const user = userEvent.setup();
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);

    // From the resolution on, persisting the placed-order record fails
    // (quota/incognito). The order EXISTS server-side — the success path must
    // still clear the cart: a stale cart would let the user re-confirm the
    // same items and create a second order.
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === PLACED_ORDER_KEY) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    });

    // Hidden success: resolve after the user navigated away — the mutation
    // onSuccess runs the placed-order write, which throws. The cart MUST still
    // clear and the flow must not leave a duplicate-order window.
    first.unmount();
    resolveOrder(HttpResponse.json({ data: PEDIDO_45 }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(postCount).toBe(1);
  });

  it('JD-A-002/JD-B-001: a writeAmbiguousMarker throw in onError still shows the ambiguous banner', async () => {
    let postSent = false;
    stubCreateOrder({
      fail: true,
      onRequest: () => {
        postSent = true;
      },
    });

    // After the POST has left the tab, persisting the ambiguous marker fails —
    // the in-memory banner and the observability report must still surface the
    // warning (never a silent re-enabled button that invites a duplicate).
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (postSent) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(AMBIGUOUS_MSG)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('W-5: a VISIBLE success leaves no placed-order banner for the next checkout mount', async () => {
    const user = userEvent.setup();
    const first = renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    // The success resolves while the component is still mounted — the user is
    // navigated to the order detail, so no placed-order record is written.
    expect(await screen.findByText('Pedido detalle 45')).toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();

    // Returning to checkout must NOT show a stale confirmation banner.
    first.unmount();
    renderCheckout();
    expect(
      screen.queryByText(/Tu pedido N°45 se confirmó/),
    ).not.toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();
  });

  it('S-3: a success resolving after navigate-away surfaces a confirmation notification on the next checkout mount', async () => {
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      onRequest: () => {
        postCount += 1;
      },
    });

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
    stubCreateOrder({
      onRequest: () => {
        postCount += 1;
      },
    });
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
    stubCreateOrder({ fail: true });

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

  it('W-6: an ambiguous failure emits a prod-visible console.warn with the log marker', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubCreateOrder({ fail: true });

    const user = userEvent.setup();
    renderCheckout();
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText(AMBIGUOUS_MSG);

    // The warn line must fire regardless of environment so an operator can
    // grep production logs for the marker (dev-only console.error is compiled
    // out in prod builds).
    const warnCalls = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes(AMBIGUOUS_LOG_MARKER),
    );
    expect(warnCalls.length).toBeGreaterThan(0);
    const payload = warnCalls[0]?.[2] as Record<string, unknown> | undefined;
    expect(payload?.marker).toEqual(readAmbiguousMarker());
  });

  it('LOW-4: a placed-order record is not surfaced or consumed while a fresh in-flight checkout exists', async () => {
    // Simulate a return-while-pending: the order POST has not settled yet (a
    // fresh in-flight record exists) AND the placed-order record was written
    // by the hidden success path.
    writeInFlightCheckout({
      tabSessionId: 'tab-A',
      idempotencyKey: 'checkout-k1',
      timestamp: Date.now(),
      fingerprint: 'f',
    });
    writePlacedOrder({ id_pedido: 45, timestamp: Date.now() });

    const first = renderCheckout();

    // While the order may still be in flight, the S-3 banner must not claim it
    // was confirmed — and the record must NOT be consumed (cleared).
    expect(
      screen.queryByText(/Tu pedido N°45 se confirmó/),
    ).not.toBeInTheDocument();
    expect(readPlacedOrder()).not.toBeNull();

    // The POST settles (in-flight record gone). The next mount surfaces the
    // confirmation and consumes the record.
    first.unmount();
    clearInFlightCheckout();
    renderCheckout();
    expect(
      await screen.findByText(/Tu pedido N°45 se confirmó/),
    ).toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();
  });

  it('R4-W1: the S-3 confirmation banner survives StrictMode double-invocation', async () => {
    // A hidden success wrote the placed-order record. React dev StrictMode
    // double-invokes state initializers — a side-effecting initializer would
    // consume the record on the first call and return null on the second, so
    // the banner would never show. The consumption must live in an effect.
    writePlacedOrder({ id_pedido: 45, timestamp: Date.now() });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/cliente/checkout']}>
          <ThemeProvider>
            <QueryClientProvider
              client={
                new QueryClient({
                  defaultOptions: { mutations: { retry: false } },
                })
              }
            >
              <Routes>
                <Route path="/cliente/checkout" element={<BuyerCheckout />} />
              </Routes>
            </QueryClientProvider>
          </ThemeProvider>
        </MemoryRouter>
      </StrictMode>,
    );

    // The confirmation surfaces AND the record is consumed exactly once.
    expect(
      await screen.findByText(/Tu pedido N°45 se confirmó/),
    ).toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();
  });

  it('R4-W2: a placed-order record deferred by an in-flight POST surfaces when the POST settles, without a remount', async () => {
    let postCount = 0;
    const resolveOrder = stubCreateOrder({
      deferred: true,
      status: 400,
      body: { detail: 'Bad request' },
      onRequest: () => {
        postCount += 1;
      },
    });

    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const user = userEvent.setup();

    // Step 1-2: mount A, confirm → POST pending; then navigate away.
    const first = renderCheckoutWithClient(qc);
    await screen.findByText('Confirmar pedido');
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(postCount).toBe(1);
    first.unmount();

    // Step 3: an earlier HIDDEN success (resolved while A was unmounted) wrote
    // the placed-order record while POST A is still pending.
    writePlacedOrder({ id_pedido: 45, timestamp: Date.now() });

    // Step 4: mount B (same QueryClient) while the POST is still in flight —
    // LOW-4: the banner must NOT claim the order and the record must survive.
    renderCheckoutWithClient(qc);
    expect(
      screen.queryByText(/Tu pedido N°45 se confirmó/),
    ).not.toBeInTheDocument();
    expect(readPlacedOrder()).not.toBeNull();

    // Step 5: POST A settles as a DEFINITIVE 400 failure — no navigation, no
    // ambiguous marker, in-flight record cleared.
    resolveOrder(HttpResponse.json({ detail: 'Bad request' }, { status: 400 }));
    await waitFor(() => {
      expect(readInFlightCheckout()).toBeNull();
    });
    expect(screen.queryByText(/Pedido detalle/)).not.toBeInTheDocument();
    expect(readAmbiguousMarker()).toBeNull();

    // Step 6: the deferred confirmation surfaces on THIS mount — no remount —
    // and the record is consumed.
    expect(
      await screen.findByText(/Tu pedido N°45 se confirmó/),
    ).toBeInTheDocument();
    expect(readPlacedOrder()).toBeNull();
  });

  it('LOW-2: the checkout mounts without crashing when storage reads throw a SecurityError', async () => {
    // The guard's storage keys are blocked (SecurityError) while unrelated
    // reads (e.g. the theme provider's own read) still work — the checkout
    // state initializers must degrade to "absent" instead of crashing.
    const blockedKeys = new Set([
      AMBIGUOUS_MARKER_KEY,
      PLACED_ORDER_KEY,
      IN_FLIGHT_CHECKOUT_KEY,
      IDEMPOTENCY_KEY_KEY,
      'rassa-checkout-tab-session',
    ]);
    const originalGetItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (blockedKeys.has(key)) {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
      return originalGetItem.call(this, key);
    });

    renderCheckout();

    // The initializers (ambiguous marker / placed-order record) degrade to
    // "absent" — the checkout still renders with the cart items.
    expect(await screen.findByText('Tomate')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmar pedido' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$30.25')).toBeInTheDocument();
  });

  it('WARNING 2: the checkout mounts without crashing when the storage PROPERTY GETTERS throw a SecurityError', async () => {
    // Firefox blocked-storage throws on the sessionStorage/localStorage
    // property getter ITSELF (not only on getItem/setItem). The checkout state
    // initializers (readAmbiguousMarker / readPlacedOrder /
    // readInFlightCheckout) must degrade to "absent" instead of crashing the
    // mount (BuyerCheckout.tsx:70-82).
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    renderCheckout();

    // The initializers ran and produced a rendered checkout with the cart
    // items and an enabled confirm button — no crash, no dead UI.
    expect(await screen.findByText('Tomate')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmar pedido' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$30.25')).toBeInTheDocument();
  });
});
