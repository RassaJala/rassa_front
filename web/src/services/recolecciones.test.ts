import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import {
  cancelarRecoleccion,
  cambiarEstadoRecoleccion,
  createRecoleccion,
  getRecolecciones,
  getTodasLasRecolecciones,
} from './recolecciones';

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getRecolecciones', () => {
  it('calls GET /recolecciones/', async () => {
    mockedApi.get.mockResolvedValue({
      data: { data: { count: 0, next: null, previous: null, results: [] } },
    });
    const result = await getRecolecciones();
    expect(mockedApi.get).toHaveBeenCalledWith('/recolecciones/', {
      params: undefined,
    });
    expect(result.data.results).toEqual([]);
  });

  it('passes filters as params', async () => {
    mockedApi.get.mockResolvedValue({
      data: { data: { count: 0, next: null, previous: null, results: [] } },
    });
    await getRecolecciones({
      estado: 'pendiente',
      fecha_desde: '2026-08-01',
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/recolecciones/', {
      params: { estado: 'pendiente', fecha_desde: '2026-08-01' },
    });
  });

  it('rejects on network error', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network Error'));
    await expect(getRecolecciones()).rejects.toThrow('Network Error');
  });

  it('rejects with backend detail on 404', async () => {
    const err = new Error('Not found');
    Object.defineProperty(err, 'isAxiosError', { value: true });
    Object.defineProperty(err, 'response', {
      value: { status: 404, data: { detail: 'Not found' } },
    });
    mockedApi.get.mockRejectedValue(err);
    await expect(getRecolecciones()).rejects.toThrow('Not found');
  });
});

describe('getTodasLasRecolecciones', () => {
  function page(ids: number[], next: string | null) {
    return {
      data: {
        data: {
          count: ids.length,
          next,
          previous: null,
          results: ids.map((id_recoleccion) => ({
            id_recoleccion,
            fk_agricultor: 10,
            agricultor_nombre: 'Juan Pérez',
            fecha_recoleccion: '2026-08-01',
            hora_inicio: '08:00:00',
            hora_fin: '10:00:00',
            estado: 'pendiente',
            comentarios: null,
            creado_en: '2026-08-01T00:00:00Z',
          })),
        },
      },
    };
  }

  it('accumulates results across multiple pages following next links', async () => {
    mockedApi.get
      .mockResolvedValueOnce(page([1], '/recolecciones/?page=2'))
      .mockResolvedValueOnce(page([2, 3], '/recolecciones/?page=3'))
      .mockResolvedValueOnce(page([4], null));

    const result = await getTodasLasRecolecciones({
      fecha_desde: '2026-08-01',
    });

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1, 2, 3, 4]);
    expect(result.truncated).toBe(false);
    expect(result.errores).toBe(0);
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/recolecciones/', {
      params: { fecha_desde: '2026-08-01' },
      signal: expect.any(AbortSignal),
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/recolecciones/?page=2', {
      params: undefined,
      signal: expect.any(AbortSignal),
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/recolecciones/?page=3', {
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it('stops fetching when next is null', async () => {
    mockedApi.get
      .mockResolvedValueOnce(page([1], '/recolecciones/?page=2'))
      .mockResolvedValueOnce(page([2], null));

    const result = await getTodasLasRecolecciones();

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1, 2]);
    expect(result.truncated).toBe(false);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('caps the pagination loop at 20 pages and signals truncation', async () => {
    mockedApi.get.mockImplementation(() =>
      Promise.resolve(page([1], '/recolecciones/?page=2')),
    );

    const result = await getTodasLasRecolecciones();

    expect(result.data).toHaveLength(20);
    expect(result.truncated).toBe(true);
    expect(mockedApi.get).toHaveBeenCalledTimes(20);
  });

  it('omits params on follow-up pages even with a fresh call', async () => {
    mockedApi.get
      .mockResolvedValueOnce(page([1], '/recolecciones/?page=2'))
      .mockResolvedValueOnce(page([2], null));

    await getTodasLasRecolecciones({ estado: 'pendiente' });

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/recolecciones/', {
      params: { estado: 'pendiente' },
      signal: expect.any(AbortSignal),
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/recolecciones/?page=2', {
      params: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it('rejects cross-origin next links, stops the loop and surfaces errores', async () => {
    mockedApi.get
      .mockResolvedValueOnce(
        page([1], 'https://evil.example/recolecciones/?page=2'),
      )
      .mockResolvedValueOnce(page([2], null));

    const result = await getTodasLasRecolecciones();

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1]);
    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(true);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('rejects protocol-relative next links, stops the loop and surfaces errores', async () => {
    mockedApi.get
      .mockResolvedValueOnce(page([1], '//evil.example/recolecciones/?page=2'))
      .mockResolvedValueOnce(page([2], null));

    const result = await getTodasLasRecolecciones();

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1]);
    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(true);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('treats a rejected non-relative next (DRF absolute URL) as a failure', async () => {
    mockedApi.get
      .mockResolvedValueOnce(
        page([1], 'http://localhost:8000/recolecciones/?page=2'),
      )
      .mockResolvedValueOnce(page([2], null));

    const result = await getTodasLasRecolecciones();

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1]);
    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(true);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('surfaces a page failure as errores without throwing', async () => {
    mockedApi.get
      .mockResolvedValueOnce(page([1], '/recolecciones/?page=2'))
      .mockRejectedValueOnce(new Error('Network Error'));

    const result = await getTodasLasRecolecciones();

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1]);
    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(true);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('does not fetch and counts no errors when aborted before starting', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await getTodasLasRecolecciones({}, controller.signal);

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.errores).toBe(0);
  });

  it('stops mid-walk without counting an aborted page as an error', async () => {
    const controller = new AbortController();
    mockedApi.get
      .mockResolvedValueOnce(page([1], '/recolecciones/?page=2'))
      .mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new Error('canceled'));
      });

    const result = await getTodasLasRecolecciones({}, controller.signal);

    expect(result.data.map((r) => r.id_recoleccion)).toEqual([1]);
    expect(result.errores).toBe(0);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });
});

describe('createRecoleccion', () => {
  it('calls POST /recolecciones/ with payload', async () => {
    mockedApi.post.mockResolvedValue({
      data: { data: { id_recoleccion: 1 } },
    });
    const payload = {
      fk_agricultor: 10,
      fecha_recoleccion: '2026-08-02',
      hora_inicio: '08:00:00',
      hora_fin: '10:00:00',
      comentarios: 'Entregar en puerta',
    };
    const result = await createRecoleccion(payload);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/recolecciones/',
      payload,
      expect.objectContaining({
        headers: { 'Idempotency-Key': expect.any(String) },
      }),
    );
    expect(result.data.id_recoleccion).toBe(1);
  });

  it('sends null optional fields when omitted', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_recoleccion: 2 } } });
    const payload = {
      fk_agricultor: 11,
      fecha_recoleccion: '2026-08-02',
      hora_inicio: null,
      hora_fin: null,
      comentarios: null,
    };
    await createRecoleccion(payload);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/recolecciones/',
      payload,
      expect.objectContaining({
        headers: { 'Idempotency-Key': expect.any(String) },
      }),
    );
  });

  it('rejects on 400 validation error', async () => {
    const err = new Error('Validation error');
    Object.defineProperty(err, 'isAxiosError', { value: true });
    Object.defineProperty(err, 'response', {
      value: { status: 400, data: { detail: 'Invalid data' } },
    });
    mockedApi.post.mockRejectedValue(err);
    await expect(
      createRecoleccion({
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-02',
      }),
    ).rejects.toThrow('Validation error');
  });
});

describe('cambiarEstadoRecoleccion', () => {
  it('calls POST /recolecciones/:id/estado/ with estado', async () => {
    mockedApi.post.mockResolvedValue({
      data: { data: { id_recoleccion: 1, estado: 'en_ruta' } },
    });
    const result = await cambiarEstadoRecoleccion(1, 'en_ruta');
    expect(mockedApi.post).toHaveBeenCalledWith('/recolecciones/1/estado/', {
      estado: 'en_ruta',
    });
    expect(result.data.estado).toBe('en_ruta');
  });

  it('SECURITY: rejects invalid ids', async () => {
    await expect(cambiarEstadoRecoleccion(0, 'en_ruta')).rejects.toThrow(
      'Invalid recoleccion: 0',
    );
    await expect(cambiarEstadoRecoleccion(-1, 'en_ruta')).rejects.toThrow(
      'Invalid recoleccion: -1',
    );
    await expect(cambiarEstadoRecoleccion(NaN, 'en_ruta')).rejects.toThrow(
      'Invalid recoleccion: NaN',
    );
  });

  it('rejects on 409 conflict', async () => {
    const err = new Error('Conflict');
    Object.defineProperty(err, 'isAxiosError', { value: true });
    Object.defineProperty(err, 'response', {
      value: { status: 409, data: { detail: 'Estado inválido' } },
    });
    mockedApi.post.mockRejectedValue(err);
    await expect(cambiarEstadoRecoleccion(1, 'en_ruta')).rejects.toThrow(
      'Conflict',
    );
  });
});

describe('cancelarRecoleccion', () => {
  it('calls POST /recolecciones/:id/cancelar/', async () => {
    mockedApi.post.mockResolvedValue({
      data: { data: { id_recoleccion: 1, estado: 'cancelado' } },
    });
    const result = await cancelarRecoleccion(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/recolecciones/1/cancelar/');
    expect(result.data.estado).toBe('cancelado');
  });

  it('SECURITY: rejects invalid ids', async () => {
    await expect(cancelarRecoleccion(0)).rejects.toThrow(
      'Invalid recoleccion: 0',
    );
    await expect(cancelarRecoleccion(-1)).rejects.toThrow(
      'Invalid recoleccion: -1',
    );
    await expect(cancelarRecoleccion(1.5)).rejects.toThrow(
      'Invalid recoleccion: 1.5',
    );
  });

  it('rejects on 403 forbidden', async () => {
    const err = new Error('Forbidden');
    Object.defineProperty(err, 'isAxiosError', { value: true });
    Object.defineProperty(err, 'response', {
      value: { status: 403, data: { detail: 'Not authorized' } },
    });
    mockedApi.post.mockRejectedValue(err);
    await expect(cancelarRecoleccion(5)).rejects.toThrow('Forbidden');
  });
});
