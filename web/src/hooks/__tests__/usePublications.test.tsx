import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicationsApi from '../../services/publications';
import {
  useAddProductoSemanal,
  useCatalogProductos,
  useClosePublicacion,
  useCreatePublicacion,
  useDeleteProductoSemanal,
  useDeletePublicacion,
  useProductosSemanales,
  usePublicacion,
  usePublicaciones,
  usePublishPublicacion,
  useUnidades,
  useUpdateProductoSemanal,
  useUploadProductoSemanalImagen,
} from '../usePublications';

vi.mock('../../constants/api', () => ({
  QUERY_STALE_TIME: 30_000,
  QUERY_RETRY: 0,
  QUERY_OPTIONS: {
    staleTime: 30_000,
    retry: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as const,
}));

vi.mock('../../utils/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('../../services/publications', () => ({
  ...vi.importActual('../../services/publications'),
  getPublicaciones: vi.fn(),
  getPublicacion: vi.fn(),
  getProductosSemanales: vi.fn(),
  getCatalogProductos: vi.fn(),
  getUnidades: vi.fn(),
  createPublicacion: vi.fn(),
  deletePublicacion: vi.fn(),
  publishPublicacion: vi.fn(),
  closePublicacion: vi.fn(),
  addProductoSemanal: vi.fn(),
  updateProductoSemanal: vi.fn(),
  deleteProductoSemanal: vi.fn(),
  uploadProductoSemanalImagen: vi.fn(),
}));

import { logError } from '../../utils/logger';

const mockedApi = vi.mocked(publicationsApi);

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const FAKE_PUBLICACIONES = {
  data: {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id_publicacion: 1,
        fk_agricultor: 10,
        fecha_publicacion: '2026-07-27',
        semana: 31,
        estado: 'borrador' as const,
        productos: [],
        creado_en: '2026-07-27T00:00:00Z',
      },
    ],
  },
};

const FAKE_PUBLICACION = {
  data: {
    id_publicacion: 1,
    fk_agricultor: 10,
    fecha_publicacion: '2026-07-27',
    semana: 31,
    estado: 'borrador' as const,
    productos: [
      {
        id_producto_semanal: 100,
        fk_producto: 5,
        fk_unidad: 2,
        stock: 10,
        precio: '500.00',
        foto: null,
        estado: 'activo',
        creado_en: '2026-07-27T00:00:00Z',
      },
    ],
    creado_en: '2026-07-27T00:00:00Z',
  },
};

const FAKE_PRODUCTOS_SEMANALES = {
  data: [
    {
      id_producto_semanal: 100,
      fk_producto: 5,
      fk_unidad: 2,
      stock: 10,
      precio: '500.00',
      foto: null,
      estado: 'activo',
      creado_en: '2026-07-27T00:00:00Z',
    },
  ],
};

const FAKE_CATALOG = {
  data: {
    results: [{ id_producto: 1, nombre_producto: 'Tomate', precio: '500' }],
  },
};

const FAKE_UNIDADES = {
  data: [{ id_unidad: 1, tipo: 'kg' }],
};

describe('usePublications — queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('usePublicaciones fetches with estado filter', async () => {
    mockedApi.getPublicaciones.mockResolvedValue(FAKE_PUBLICACIONES);
    const { result } = renderHook(() => usePublicaciones('borrador'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getPublicaciones).toHaveBeenCalledWith({
      estado: 'borrador',
    });
    expect(result.current.data).toEqual(FAKE_PUBLICACIONES);
  });

  it('usePublicaciones fetches without filter when estado is undefined', async () => {
    mockedApi.getPublicaciones.mockResolvedValue(FAKE_PUBLICACIONES);
    const { result } = renderHook(() => usePublicaciones(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getPublicaciones).toHaveBeenCalledWith(undefined);
  });

  it('usePublicacion returns a single publication', async () => {
    mockedApi.getPublicacion.mockResolvedValue(FAKE_PUBLICACION);
    const { result } = renderHook(() => usePublicacion(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getPublicacion).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual(FAKE_PUBLICACION);
  });

  it('usePublicacion is disabled when id <= 0', () => {
    const { result } = renderHook(() => usePublicacion(0), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useProductosSemanales fetches productos for a pubId', async () => {
    mockedApi.getProductosSemanales.mockResolvedValue(FAKE_PRODUCTOS_SEMANALES);
    const { result } = renderHook(() => useProductosSemanales(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getProductosSemanales).toHaveBeenCalledWith(1);
  });

  it('useProductosSemanales is disabled when pubId <= 0', () => {
    const { result } = renderHook(() => useProductosSemanales(0), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useCatalogProductos fetches catalog', async () => {
    mockedApi.getCatalogProductos.mockResolvedValue(FAKE_CATALOG);
    const { result } = renderHook(() => useCatalogProductos(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getCatalogProductos).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(FAKE_CATALOG);
  });

  it('useUnidades fetches unidades', async () => {
    mockedApi.getUnidades.mockResolvedValue(FAKE_UNIDADES);
    const { result } = renderHook(() => useUnidades(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.getUnidades).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(FAKE_UNIDADES);
  });

  it('usePublicaciones shows error state on network failure', async () => {
    mockedApi.getPublicaciones.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => usePublicaciones(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('usePublicacion shows error state on 404', async () => {
    const notFound = new Error('Not found');
    Object.defineProperty(notFound, 'isAxiosError', { value: true });
    Object.defineProperty(notFound, 'response', {
      value: { status: 404, data: { detail: 'Not found' } },
    });
    mockedApi.getPublicacion.mockRejectedValue(notFound);
    const { result } = renderHook(() => usePublicacion(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('useProductosSemanales shows error state on API failure', async () => {
    mockedApi.getProductosSemanales.mockRejectedValue(new Error('API failure'));
    const { result } = renderHook(() => useProductosSemanales(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('usePublicaciones with empty results array', async () => {
    const empty = {
      data: { count: 0, next: null, previous: null, results: [] },
    };
    mockedApi.getPublicaciones.mockResolvedValue(empty);
    const { result } = renderHook(() => usePublicaciones(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.results).toHaveLength(0);
    expect(result.current.data?.data.count).toBe(0);
  });

  it('usePublicacion with negative id (should be disabled)', () => {
    const { result } = renderHook(() => usePublicacion(-5), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedApi.getPublicacion).not.toHaveBeenCalled();
  });

  it('usePublicacion shows error state with AxiosError type', async () => {
    const serverError = new Error('Server error');
    Object.defineProperty(serverError, 'isAxiosError', { value: true });
    Object.defineProperty(serverError, 'response', {
      value: { status: 500, data: { detail: 'Internal server error' } },
    });
    mockedApi.getPublicacion.mockRejectedValue(serverError);
    const { result } = renderHook(() => usePublicacion(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('usePublications — mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('useCreatePublicacion succeeds', async () => {
    mockedApi.createPublicacion.mockResolvedValue({
      data: FAKE_PUBLICACION.data,
    });
    const { result } = renderHook(() => useCreatePublicacion(), {
      wrapper: createWrapper(),
    });
    const res = await result.current.mutateAsync();
    expect(mockedApi.createPublicacion).toHaveBeenCalledOnce();
    expect(res.data.id_publicacion).toBe(1);
  });

  it('useDeletePublicacion succeeds', async () => {
    mockedApi.deletePublicacion.mockResolvedValue({} as never);
    const { result } = renderHook(() => useDeletePublicacion(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync(1);
    expect(mockedApi.deletePublicacion).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );
  });

  it('usePublishPublicacion succeeds', async () => {
    mockedApi.publishPublicacion.mockResolvedValue({} as never);
    const { result } = renderHook(() => usePublishPublicacion(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync(1);
    expect(mockedApi.publishPublicacion).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );
  });

  it('useClosePublicacion succeeds', async () => {
    mockedApi.closePublicacion.mockResolvedValue({} as never);
    const { result } = renderHook(() => useClosePublicacion(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync(1);
    expect(mockedApi.closePublicacion).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );
  });

  it('useAddProductoSemanal succeeds', async () => {
    mockedApi.addProductoSemanal.mockResolvedValue({
      data: { id_producto_semanal: 200 },
    });
    const { result } = renderHook(() => useAddProductoSemanal(), {
      wrapper: createWrapper(),
    });
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 10, precio: 500 };
    const res = await result.current.mutateAsync({ pubId: 1, payload });
    expect(mockedApi.addProductoSemanal).toHaveBeenCalledWith(1, payload);
    expect(res.data.id_producto_semanal).toBe(200);
  });

  it('useUpdateProductoSemanal succeeds', async () => {
    mockedApi.updateProductoSemanal.mockResolvedValue({
      data: { id_producto_semanal: 100 },
    });
    const { result } = renderHook(() => useUpdateProductoSemanal(), {
      wrapper: createWrapper(),
    });
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 15, precio: 600 };
    await result.current.mutateAsync({ pubId: 1, itemId: 100, payload });
    expect(mockedApi.updateProductoSemanal).toHaveBeenCalledWith(
      1,
      100,
      payload,
    );
  });

  it('useDeleteProductoSemanal succeeds', async () => {
    mockedApi.deleteProductoSemanal.mockResolvedValue({} as never);
    const { result } = renderHook(() => useDeleteProductoSemanal(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ pubId: 1, itemId: 100 });
    expect(mockedApi.deleteProductoSemanal).toHaveBeenCalledWith(1, 100);
  });

  it('useUploadProductoSemanalImagen succeeds', async () => {
    mockedApi.uploadProductoSemanalImagen.mockResolvedValue({} as never);
    const { result } = renderHook(() => useUploadProductoSemanalImagen(), {
      wrapper: createWrapper(),
    });
    const formData = new FormData();
    formData.append('imagen', new File([], 'test.jpg'));
    await result.current.mutateAsync({ pubId: 1, itemId: 100, formData });
    expect(mockedApi.uploadProductoSemanalImagen).toHaveBeenCalledWith(
      1,
      100,
      formData,
    );
  });

  it('useAddProductoSemanal propagates error', async () => {
    mockedApi.addProductoSemanal.mockRejectedValue(
      new Error('validation error'),
    );
    const { result } = renderHook(() => useAddProductoSemanal(), {
      wrapper: createWrapper(),
    });
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 0, precio: 0 };
    await expect(
      result.current.mutateAsync({ pubId: 1, payload }),
    ).rejects.toThrow('validation error');
  });

  it('usePublicaciones propagates error', async () => {
    mockedApi.getPublicaciones.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePublicaciones(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('useCreatePublicacion mutation error triggers onError callback', async () => {
    mockedApi.createPublicacion.mockRejectedValue(new Error('create failed'));
    const { result } = renderHook(() => useCreatePublicacion(), {
      wrapper: createWrapper(),
    });
    await expect(result.current.mutateAsync()).rejects.toThrow('create failed');
    expect(logError).toHaveBeenCalledWith(
      'publications.createPublicacion',
      expect.any(Error),
    );
  });

  it('useDeletePublicacion mutation error triggers onError callback', async () => {
    mockedApi.deletePublicacion.mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => useDeletePublicacion(), {
      wrapper: createWrapper(),
    });
    await expect(result.current.mutateAsync(1)).rejects.toThrow(
      'delete failed',
    );
    expect(logError).toHaveBeenCalledWith(
      'publications.deletePublicacion',
      expect.any(Error),
    );
  });

  it('usePublishPublicacion mutation error triggers onError callback', async () => {
    mockedApi.publishPublicacion.mockRejectedValue(new Error('publish failed'));
    const { result } = renderHook(() => usePublishPublicacion(), {
      wrapper: createWrapper(),
    });
    await expect(result.current.mutateAsync(1)).rejects.toThrow(
      'publish failed',
    );
    expect(logError).toHaveBeenCalledWith(
      'publications.publishPublicacion',
      expect.any(Error),
    );
  });

  it('useAddProductoSemanal mutation error triggers onError callback', async () => {
    mockedApi.addProductoSemanal.mockRejectedValue(new Error('add failed'));
    const { result } = renderHook(() => useAddProductoSemanal(), {
      wrapper: createWrapper(),
    });
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 10, precio: 500 };
    await expect(
      result.current.mutateAsync({ pubId: 1, payload }),
    ).rejects.toThrow('add failed');
    expect(logError).toHaveBeenCalledWith(
      'publications.addProductoSemanal',
      expect.any(Error),
    );
  });

  it('useUploadProductoSemanalImagen mutation error triggers onError callback', async () => {
    mockedApi.uploadProductoSemanalImagen.mockRejectedValue(
      new Error('upload failed'),
    );
    const { result } = renderHook(() => useUploadProductoSemanalImagen(), {
      wrapper: createWrapper(),
    });
    const formData = new FormData();
    formData.append('imagen', new File([], 'test.jpg'));
    await expect(
      result.current.mutateAsync({ pubId: 1, itemId: 1, formData }),
    ).rejects.toThrow('upload failed');
    expect(logError).toHaveBeenCalledWith(
      'publications.uploadProductoSemanalImagen',
      expect.any(Error),
    );
  });

  it('useDeletePublicacion called twice rapidly (double-submit not prevented at hook level)', async () => {
    mockedApi.deletePublicacion.mockResolvedValue({} as never);
    const { result } = renderHook(() => useDeletePublicacion(), {
      wrapper: createWrapper(),
    });
    await Promise.all([
      result.current.mutateAsync(1),
      result.current.mutateAsync(1),
    ]);
    expect(mockedApi.deletePublicacion).toHaveBeenCalledTimes(2);
  });

  it('cache invalidation after mutation success', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(qc, 'invalidateQueries');
    mockedApi.createPublicacion.mockResolvedValue({
      data: { id_publicacion: 1 } as never,
    });
    const { result } = renderHook(() => useCreatePublicacion(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await result.current.mutateAsync();
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['publicaciones'],
    });
  });

  it('cache invalidation after publish mutation invalidates list and detail', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(qc, 'invalidateQueries');
    mockedApi.publishPublicacion.mockResolvedValue({} as never);
    const { result } = renderHook(() => usePublishPublicacion(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await result.current.mutateAsync(5);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['publicaciones'],
    });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['publicaciones', 5],
    });
  });

  it('multiple different mutations do not interfere with each other', async () => {
    mockedApi.createPublicacion.mockResolvedValue({
      data: { id_publicacion: 1 } as never,
    });
    mockedApi.deletePublicacion.mockResolvedValue({} as never);
    mockedApi.publishPublicacion.mockResolvedValue({} as never);
    const { result: create } = renderHook(() => useCreatePublicacion(), {
      wrapper: createWrapper(),
    });
    const { result: del } = renderHook(() => useDeletePublicacion(), {
      wrapper: createWrapper(),
    });
    const { result: publish } = renderHook(() => usePublishPublicacion(), {
      wrapper: createWrapper(),
    });
    const res = await create.current.mutateAsync();
    expect(res.data.id_publicacion).toBe(1);
    await del.current.mutateAsync(1);
    expect(mockedApi.deletePublicacion).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );
    await publish.current.mutateAsync(1);
    expect(mockedApi.publishPublicacion).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );
  });
});
