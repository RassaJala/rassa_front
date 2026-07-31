import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { useCartStore } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { BuyerCart } from '../BuyerCart';
import { BuyerCheckout } from '../BuyerCheckout';

const AMBIGUOUS_MSG =
  'No pudimos confirmar si tu pedido se creó. Revisá tus pedidos antes de intentar de nuevo.';

const ORDER_ERROR_DEFAULT = 'Error del servidor. Intenta de nuevo.';

const SANITIZED_5XX =
  'Error interno del servidor. Revisa los logs del backend.';

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

const PEDIDO_45 = {
  id_pedido: 45,
  cliente_nombre: 'Cliente Demo',
  estado: 'pendiente',
  subtotal: '25.00',
  iva: '5.25',
  total: '30.25',
  detalles: [],
  creado_en: '2026-07-31T13:00:00Z',
};

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
  useCartStore.setState({ items: CART_ITEMS });
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

    expect(await screen.findByText(SANITIZED_5XX)).toBeInTheDocument();
    expect(screen.queryByText(/Traceback/)).not.toBeInTheDocument();
    expect(screen.queryByText('<html>')).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});
