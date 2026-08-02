import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server';
import { nombreCompletoAgricultor } from '../../utils/recolecciones';
import { useAgricultoresUbicacion } from '../useAgricultoresUbicacion';

vi.mock('../../utils/logger', () => ({
  logError: vi.fn(),
}));

import { logError } from '../../utils/logger';

const BASE = '/api';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('nombreCompletoAgricultor', () => {
  it('joins available name parts', () => {
    expect(
      nombreCompletoAgricultor({
        nombre: 'Ana',
        apellido_paterno: 'Ramírez',
        apellido_materno: null,
      }),
    ).toBe('Ana Ramírez');
    expect(
      nombreCompletoAgricultor({
        nombre: 'Ana',
        apellido_paterno: 'Ramírez',
        apellido_materno: 'López',
      }),
    ).toBe('Ana Ramírez López');
  });
});

describe('useAgricultoresUbicacion', () => {
  it('loads and groups agricultores by ubicacion', async () => {
    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.errores).toBe(0);
    expect(result.current.truncated).toBe(false);
    expect(result.current.agricultores).toHaveLength(1);
    expect(result.current.agricultores[0]?.municipioNombre).toBe('Jalisco');

    const localidades = result.current.agricultores[0]?.localidades ?? [];
    expect(localidades.map((l) => l.localidadNombre)).toEqual([
      'Guadalajara',
      'Tlaquepaque',
    ]);
    expect(localidades[0]?.agricultores[0]?.nombre).toBe('Juan');
    expect(localidades[1]?.agricultores[0]?.nombre).toBe('Ana');
  });

  it('returns empty groups when there are no agricultores', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () =>
        HttpResponse.json({
          data: { count: 0, next: null, previous: null, results: [] },
        }),
      ),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.agricultores).toHaveLength(0);
  });

  it('marks total failure as error and logs it', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () =>
        HttpResponse.json({ detail: 'Internal error' }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(logError).toHaveBeenCalledWith(
      'useAgricultoresUbicacion',
      expect.any(Error),
    );
  });

  it('surfaces partial failures as errores without failing the query', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({
            data: {
              count: 1,
              next: '/recolecciones/agricultores/?page=2',
              previous: null,
              results: [
                {
                  id_usuario: 10,
                  nombre: 'Juan',
                  apellido_paterno: 'Pérez',
                  apellido_materno: null,
                  role: 'farmer',
                  localidad: 1,
                },
              ],
            },
          });
        }
        return HttpResponse.json({ detail: 'Internal error' }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.errores).toBe(1);
    expect(result.current.truncated).toBe(true);
    expect(
      result.current.agricultores.flatMap((g) =>
        g.localidades.flatMap((l) => l.agricultores),
      ),
    ).toHaveLength(1);
  });

  it('does not fetch while disabled', async () => {
    let called = false;
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () => {
        called = true;
        return HttpResponse.json({
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    const { result } = renderHook(
      () => useAgricultoresUbicacion({ enabled: false }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(called).toBe(false);
    expect(result.current.agricultores).toHaveLength(0);
  });

  it('excludes agricultores whose localidad is inactive (estado=false)', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () =>
        HttpResponse.json({
          data: {
            count: 3,
            next: null,
            previous: null,
            results: [
              {
                id_usuario: 10,
                nombre: 'Juan',
                apellido_paterno: 'Pérez',
                apellido_materno: null,
                role: 'farmer',
                localidad: 1,
              },
              {
                id_usuario: 12,
                nombre: 'Zeta',
                apellido_paterno: 'Inactiva',
                apellido_materno: null,
                role: 'farmer',
                localidad: 2,
              },
              {
                id_usuario: 13,
                nombre: 'Sin',
                apellido_paterno: 'Asignar',
                apellido_materno: null,
                role: 'farmer',
                localidad: null,
              },
            ],
          },
        }),
      ),
      http.get(`${BASE}/municipios/`, () =>
        HttpResponse.json({
          data: [{ id_municipio: 1, nombre: 'Jalisco', estado: true }],
        }),
      ),
      http.get(`${BASE}/localidades/`, () =>
        HttpResponse.json({
          data: [
            {
              id_localidad: 1,
              nombre: 'Guadalajara',
              municipio_id: 1,
              estado: true,
            },
            {
              id_localidad: 2,
              nombre: 'Zapopan',
              municipio_id: 1,
              estado: false,
            },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);

    const todos = result.current.agricultores.flatMap((g) =>
      g.localidades.flatMap((l) => l.agricultores),
    );
    // El agricultor de la localidad inactiva no aparece; el de localidad null sí.
    expect(todos.map((a) => a.id_usuario)).toEqual([10, 13]);
    expect(todos.some((a) => a.nombre === 'Zeta')).toBe(false);
  });

  it('excludes agricultores of inactive municipios (never fetched nor grouped)', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () =>
        HttpResponse.json({
          data: {
            count: 2,
            next: null,
            previous: null,
            results: [
              {
                id_usuario: 10,
                nombre: 'Juan',
                apellido_paterno: 'Pérez',
                apellido_materno: null,
                role: 'farmer',
                localidad: 1,
              },
              {
                id_usuario: 14,
                nombre: 'Muni',
                apellido_paterno: 'Inactivo',
                apellido_materno: null,
                role: 'farmer',
                localidad: 3,
              },
            ],
          },
        }),
      ),
      http.get(`${BASE}/municipios/`, () =>
        HttpResponse.json({
          data: [
            { id_municipio: 1, nombre: 'Jalisco', estado: true },
            { id_municipio: 2, nombre: 'Colima', estado: false },
          ],
        }),
      ),
      http.get(`${BASE}/localidades/`, ({ request }) => {
        const url = new URL(request.url);
        const municipioId = Number(url.searchParams.get('municipio_id'));
        return HttpResponse.json({
          data: [
            {
              id_localidad: 1,
              nombre: 'Guadalajara',
              municipio_id: 1,
              estado: true,
            },
            ...(municipioId === 2
              ? [
                  {
                    id_localidad: 3,
                    nombre: 'Manzanillo',
                    municipio_id: 2,
                    estado: true,
                  },
                ]
              : []),
          ],
        });
      }),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);

    const todos = result.current.agricultores.flatMap((g) =>
      g.localidades.flatMap((l) => l.agricultores),
    );
    expect(todos.map((a) => a.id_usuario)).toEqual([10]);
    expect(todos.some((a) => a.nombre === 'Muni')).toBe(false);
  });

  it('fetches municipios before agricultores so the shared budget is accurate', async () => {
    const order: string[] = [];
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () => {
        order.push('agricultores');
        return HttpResponse.json({
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
      http.get(`${BASE}/municipios/`, async () => {
        order.push('municipios');
        // Marca la fase como terminada al final del handler: lo relevante no es
        // el orden de despacho (una versión en paralelo lo despacharía igual),
        // sino que municipios COMPLETA antes de que agricultores arranque — el
        // presupuesto restante solo se conoce al terminar la fase anterior.
        await Promise.resolve();
        order.push('municipios-done');
        return HttpResponse.json({ data: [] });
      }),
    );

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.agricultores).toHaveLength(0);

    // Las fases corren en serie: el presupuesto restante para agricultores solo
    // se conoce cuando municipios termina, y el deadline también cubre municipios.
    expect(order).toEqual(['municipios', 'municipios-done', 'agricultores']);
  });

  it('counts deadline-expired localidad fetches as fallos and logs them', async () => {
    server.use(
      http.get(`${BASE}/recolecciones/agricultores/`, () =>
        HttpResponse.json({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id_usuario: 10,
                nombre: 'Juan',
                apellido_paterno: 'Pérez',
                apellido_materno: null,
                role: 'farmer',
                localidad: 1,
              },
            ],
          },
        }),
      ),
      http.get(`${BASE}/municipios/`, () =>
        HttpResponse.json({
          data: [{ id_municipio: 1, nombre: 'Jalisco', estado: true }],
        }),
      ),
      // La localidad tarda más que el deadline inyectado: al vencer la pared
      // el fetch se aborta y se descuenta como fallo (banner), no como
      // cancelación del llamador.
      http.get(`${BASE}/localidades/`, async () => {
        await delay(500);
        return HttpResponse.json({ data: [] });
      }),
    );

    const { result } = renderHook(
      () => useAgricultoresUbicacion({ deadlineMs: 50 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.errores).toBe(1);
    expect(logError).toHaveBeenCalledWith(
      'useAgricultoresUbicacion',
      expect.objectContaining({ message: 'Deadline de carga alcanzado' }),
      expect.objectContaining({ fallos: 1 }),
    );
  });
});
