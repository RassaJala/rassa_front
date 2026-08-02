import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server';
import {
  getFullNameAgricultor,
  useAgricultoresUbicacion,
} from '../useAgricultoresUbicacion';

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

describe('getFullNameAgricultor', () => {
  it('joins available name parts', () => {
    expect(
      getFullNameAgricultor({
        id_usuario: 1,
        nombre: 'Ana',
        apellido_paterno: 'Ramírez',
        apellido_materno: null,
        role: 'farmer',
        localidad: 1,
      }),
    ).toBe('Ana Ramírez');
    expect(
      getFullNameAgricultor({
        id_usuario: 2,
        nombre: 'Ana',
        apellido_paterno: 'Ramírez',
        apellido_materno: 'López',
        role: 'farmer',
        localidad: 1,
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
});
