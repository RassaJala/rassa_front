import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('rejects a quantity above the available stock', async () => {
    seedMocks();
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    const comboboxes = screen.getAllByRole('combobox');
    await user.selectOptions(comboboxes[0] as HTMLElement, '1');
    await user.selectOptions(comboboxes[1] as HTMLElement, '100');
    await user.type(screen.getByPlaceholderText('0'), '99');
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    await user.selectOptions(comboboxes[2] as HTMLElement, '1');
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));

    expect(await screen.findByText('Stock disponible: 5.')).toBeInTheDocument();
  });

  it('posts the record and invalidates the products query on success', async () => {
    seedMocks();
    let posted = false;
    server.use(
      http.post(`${BASE}/mermas/`, async ({ request }) => {
        posted = true;
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.fk_producto_semanal).toBe(100);
        expect(body.fk_pedido).toBe(1);
        expect(body.cantidad).toBe(2);
        expect(body.motivo).toBe('Se venció');
        return HttpResponse.json({ data: { id_merma: 1 } });
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /Tomate/ });
    const comboboxes = screen.getAllByRole('combobox');
    await user.selectOptions(comboboxes[0] as HTMLElement, '1');
    await user.selectOptions(comboboxes[1] as HTMLElement, '100');
    await user.type(screen.getByPlaceholderText('0'), '2');
    await user.type(
      screen.getByPlaceholderText('Ej: producto dañado por el clima'),
      'Se venció',
    );
    await user.selectOptions(comboboxes[2] as HTMLElement, '1');
    await user.click(screen.getByRole('button', { name: /Registrar Merma/ }));

    await waitFor(() => expect(posted).toBe(true));
    expect(
      await screen.findByText('Merma registrada correctamente.'),
    ).toBeInTheDocument();
  });
});
