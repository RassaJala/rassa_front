import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { todayString } from '../../utils/recolecciones';

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      rol: 'vendedor',
      email: 'vendedor@rassa.com',
      nombre: 'Vendedor',
    },
  }),
}));

import { SellerRecolecciones } from '../SellerRecolecciones';

const BASE = '/api';

function LocationProbe({
  onChange,
}: {
  readonly onChange: (path: string) => void;
}) {
  const location = useLocation();
  useEffect(() => {
    onChange(location.pathname);
  }, [location.pathname, onChange]);
  return null;
}

function renderPage(onLocationChange?: (path: string) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <SellerRecolecciones />
          {onLocationChange ? (
            <LocationProbe onChange={onLocationChange} />
          ) : null}
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SellerRecolecciones — integration', () => {
  it('fetches and displays recolecciones from the API', async () => {
    renderPage();
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('button', { name: 'Iniciar ruta' }),
    ).toBeInTheDocument();
  });

  it('transitions estado and shows success toast', async () => {
    renderPage();
    await screen.findByText('Juan Pérez');

    const iniciarRuta = screen.getByRole('button', { name: 'Iniciar ruta' });
    await userEvent.click(iniciarRuta);

    expect(
      await screen.findByText('Estado actualizado correctamente.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Iniciar ruta' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: 'Recolectado' }),
      ).toHaveLength(2);
    });
  });

  it('cancels a recoleccion via confirm dialog', async () => {
    renderPage();
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(
      screen.getByText(
        '¿Estás seguro de que querés cancelar esta recolección?',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

    expect(
      await screen.findByText('Recolección cancelada.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Cancelar' }),
      ).not.toBeInTheDocument();
    });
  });

  it('opens the schedule modal and programs a recoleccion', async () => {
    renderPage();
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: /Nueva/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Programar recolección/ }),
      ).toBeInTheDocument();
    });

    const agricultorRow = await screen.findByRole('button', {
      name: /Ana Ram\u00edrez/,
    });
    await userEvent.click(agricultorRow);

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText('Recolección programada correctamente.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ana Ramírez')).toBeInTheDocument();
  });

  it('keeps duplicate markers when the list is filtered', async () => {
    renderPage();
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelado' }));
    await screen.findByText('No hay recolecciones en este estado');

    await userEvent.click(screen.getByRole('button', { name: /Nueva/ }));

    expect(await screen.findByText('Ya tiene recolección')).toBeInTheDocument();
  });

  it('opens a chat with the farmer and navigates to it', async () => {
    server.use(
      http.post(`${BASE}/chat/conversaciones/crear-privada/`, () =>
        HttpResponse.json({ ok: true, data: { id_conversacion: 7 } }),
      ),
    );

    let currentPath = '';
    renderPage((path) => {
      currentPath = path;
    });
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: 'Contactar' }));

    await waitFor(() => expect(currentPath).toBe('/vendedor/chat/7'));
  });

  it('shows the degraded duplicate banner when the full fetch fails', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/`, () =>
        HttpResponse.json({ detail: 'Not found' }, { status: 404 }),
      ),
    );

    renderPage();
    await screen.findByText('Error al cargar recolecciones');

    await userEvent.click(screen.getByRole('button', { name: /Nueva/ }));

    expect(
      await screen.findByText(/No se pudieron cargar todas las recolecciones/),
    ).toBeInTheDocument();
  });

  it('does not show the degraded banner while the full fetch is loading', async () => {
    const recoleccion = {
      id_recoleccion: 1,
      fk_agricultor: 10,
      agricultor_nombre: 'Juan Pérez',
      fecha_recoleccion: todayString(),
      hora_inicio: '08:00:00',
      hora_fin: '10:00:00',
      estado: 'pendiente',
      comentarios: null,
      creado_en: `${todayString()}T00:00:00Z`,
    };
    let requests = 0;
    server.use(
      http.get(`${BASE}/recolecciones/`, async () => {
        requests += 1;
        if (requests > 1) {
          // La consulta paginada (`todas`) se deja en vuelo mientras el modal
          // está abierto para probar que el banner no se gatea por su carga.
          await delay(300);
        }
        return HttpResponse.json({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [recoleccion],
          },
        });
      }),
    );

    renderPage();
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: /Nueva/ }));

    await screen.findByRole('button', { name: /Programar recolección/ });
    // El modal ya está abierto y `todas` aún carga: no debe verse el banner.
    expect(
      screen.queryByText(/No se pudieron cargar todas las recolecciones/),
    ).not.toBeInTheDocument();
  });

  it('shows the success toast immediately and warns when the refetch fails', async () => {
    const recoleccion = {
      id_recoleccion: 1,
      fk_agricultor: 10,
      agricultor_nombre: 'Juan Pérez',
      fecha_recoleccion: todayString(),
      hora_inicio: '08:00:00',
      hora_fin: '10:00:00',
      estado: 'pendiente',
      comentarios: null,
      creado_en: `${todayString()}T00:00:00Z`,
    };
    let requests = 0;
    server.use(
      http.get(`${BASE}/recolecciones/`, async () => {
        requests += 1;
        if (requests > 1) {
          // El refetch tras el guardado falla (con retraso para que el toast de
          // éxito sea observable antes de degradarse al aviso secundario).
          await delay(300);
          return HttpResponse.json({ detail: 'boom' }, { status: 500 });
        }
        return HttpResponse.json({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [recoleccion],
          },
        });
      }),
    );

    renderPage();
    await screen.findByText('Juan Pérez');

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar ruta' }));

    // El éxito se muestra de inmediato, sin esperar al refetch en segundo plano.
    expect(
      await screen.findByText('Estado actualizado correctamente.'),
    ).toBeInTheDocument();

    // Al fallar el refetch se degrada a un aviso secundario. El 500 se reintenta
    // (axios-retry con backoff), así que el aviso tarda más del timeout por
    // defecto de findByText.
    expect(
      await screen.findByText(
        'El cambio se guardó, pero no se pudo actualizar la lista.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});

describe('SellerRecolecciones — chat', () => {
  it('permite reintentar contacto tras error de chat', async () => {
    server.use(
      http.post(`${BASE}/chat/conversations/`, () =>
        HttpResponse.json({ detail: 'Error interno' }, { status: 500 }),
      ),
    );

    renderPage();
    await screen.findByText('Juan Pérez');

    const contactar = screen.getAllByRole('button', { name: 'Contactar' })[0]!;
    await userEvent.click(contactar);

    expect(
      await screen.findByText(
        'No se pudo abrir el chat con el agricultor.',
      ),
    ).toBeInTheDocument();

    // El botón debe seguir habilitado para reintentar
    expect(contactar).not.toBeDisabled();
  });
});
