/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAgricultoresUbicacion } from '@/hooks/useAgricultoresUbicacion';

import api from '@/services/api';

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  isApiUrl: (url: string) => url.startsWith('/'),
}));

const getMock = api.get as jest.Mock;

interface FarmerPage {
  readonly results: unknown[];
  readonly next: string | null;
}

function makeFarmer(id: number, localidad: number | null): object {
  return {
    id_usuario: id,
    email: `agricultor${id}@rassa.test`,
    role: 'farmer',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    localidad,
    localidad_nombre: 'La Esperanza',
    estado: true,
    creado_en: '2026-01-01T00:00:00Z',
  };
}

function farmerPage(results: unknown[], next: string | null): FarmerPage {
  return { results, next };
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapper(queryClient: QueryClient): React.ComponentType<{
  readonly children: React.ReactNode;
}> {
  return function TestWrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAgricultoresUbicacion', () => {
  it('agrupa agricultores por municipio y localidad', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/municipios/') {
        return Promise.resolve({
          data: [{ id_municipio: 5, nombre: 'Zacapa', estado: true }],
        });
      }
      if (url.startsWith('/localidades/')) {
        return Promise.resolve({
          data: [
            {
              id_localidad: 1,
              nombre: 'La Esperanza',
              municipio_id: 5,
              estado: true,
            },
          ],
        });
      }
      return Promise.resolve({
        data: farmerPage([makeFarmer(11, 1)], null),
      });
    });

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: wrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.agricultores).toHaveLength(1);
    expect(result.current.agricultores[0]?.municipioNombre).toBe('Zacapa');
    expect(
      result.current.agricultores[0]?.localidades[0]?.localidadNombre,
    ).toBe('La Esperanza');
    expect(
      result.current.agricultores[0]?.localidades[0]?.agricultores[0]
        ?.id_usuario,
    ).toBe(11);
    expect(result.current.errores).toBe(0);
    expect(result.current.truncated).toBe(false);
  });

  it('no consulta nada cuando enabled es false', async () => {
    const { result } = renderHook(
      () => useAgricultoresUbicacion({ enabled: false }),
      {
        wrapper: wrapper(makeQueryClient()),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMock).not.toHaveBeenCalled();
  });

  it('tolera fallos parciales de localidades y los reporta en errores', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/municipios/') {
        return Promise.resolve({
          data: [
            { id_municipio: 5, nombre: 'Zacapa', estado: true },
            { id_municipio: 6, nombre: 'Chiquimula', estado: true },
          ],
        });
      }
      if (url === '/localidades/?municipio_id=5') {
        return Promise.resolve({
          data: [
            {
              id_localidad: 1,
              nombre: 'La Esperanza',
              municipio_id: 5,
              estado: true,
            },
          ],
        });
      }
      if (url === '/localidades/?municipio_id=6') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        data: farmerPage([makeFarmer(11, 1)], null),
      });
    });

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: wrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.agricultores[0]?.municipioNombre).toBe('Zacapa');
    expect(result.current.errores).toBe(1);
  });

  it('propaga errores parciales de páginas de agricultores', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/municipios/') {
        return Promise.resolve({
          data: [{ id_municipio: 5, nombre: 'Zacapa', estado: true }],
        });
      }
      if (url.startsWith('/localidades/')) {
        return Promise.resolve({
          data: [
            {
              id_localidad: 1,
              nombre: 'La Esperanza',
              municipio_id: 5,
              estado: true,
            },
          ],
        });
      }
      if (url.includes('page=2')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        data: farmerPage(
          [makeFarmer(11, 1)],
          '/admin/usuarios/?rol=Agricultor&estado=true&page=2',
        ),
      });
    });

    const { result } = renderHook(() => useAgricultoresUbicacion(), {
      wrapper: wrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.agricultores[0]?.localidades[0]?.agricultores,
    ).toHaveLength(1);
    expect(result.current.errores).toBe(1);
  });
});
