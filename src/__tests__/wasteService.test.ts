/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  createWasteRecord,
  fetchCurrentPublications,
  fetchMermaResumen,
  fetchWasteOrders,
} from '@/services/waste';
import api, { isApiUrl } from '@/services/api';

jest.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;

const resumen = {
  agrupacion: 'mes' as const,
  total_general: 10,
  producto_mas_afectado: null,
  detalle: [],
};

describe('waste service (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps the envelope and returns data on ok: true', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { ok: true, data: resumen } });

    await expect(fetchMermaResumen()).resolves.toEqual(resumen);
    expect(mockApi.get).toHaveBeenCalledWith('/mermas/resumen/');
  });

  it('throws when the backend responds with ok: false', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { ok: false, message: 'No autorizado' },
    });

    await expect(fetchMermaResumen()).rejects.toThrow('No autorizado');
  });

  it('throws when data is missing from the envelope', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { ok: true } });

    await expect(fetchMermaResumen()).rejects.toThrow(
      'Error en la respuesta del servidor',
    );
  });

  it('builds the resumen query params for the backend', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { ok: true, data: resumen } });

    await fetchMermaResumen({
      fecha_desde: '2026-07-01',
      fecha_hasta: '2026-07-31',
      producto_id: 2,
      agrupar_por: 'mes',
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      '/mermas/resumen/?fecha_desde=2026-07-01&fecha_hasta=2026-07-31&producto_id=2&agrupar_por=mes',
    );
  });
});

describe('waste register service (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts a waste record with the full payload', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { data: { id_merma: 1, cantidad: 2 } },
    });

    const result = await createWasteRecord({
      fk_producto_semanal: 100,
      fk_pedido: 7,
      cantidad: 2,
      motivo: 'Se venció',
      fk_decision: 1,
      comentarios: 'nota',
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/mermas/',
      {
        fk_producto_semanal: 100,
        fk_pedido: 7,
        cantidad: 2,
        motivo: 'Se venció',
        fk_decision: 1,
        comentarios: 'nota',
      },
      { headers: { 'Idempotency-Key': expect.any(String) } },
    );
    expect(result).toEqual({ id_merma: 1, cantidad: 2 });
  });

  it('falls back to a timestamp-based key when crypto.randomUUID is missing', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    try {
      // Force the fallback branch of createIdempotencyKey: crypto exists but
      // randomUUID is not a function (Hermes / non-secure contexts).
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: { randomUUID: undefined },
      });
      mockApi.post.mockResolvedValueOnce({
        data: { data: { id_merma: 2, cantidad: 1 } },
      });

      await createWasteRecord({
        fk_producto_semanal: 100,
        fk_pedido: 7,
        cantidad: 1,
        motivo: 'Se venció',
        fk_decision: 1,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/mermas/',
        expect.objectContaining({ fk_producto_semanal: 100 }),
        expect.objectContaining({
          headers: {
            'Idempotency-Key': expect.stringMatching(
              /^\d+-[0-9a-z]+-[0-9a-z]+$/,
            ),
          },
        }),
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        // Restore the pristine global when it did not exist before the stub.
        delete (globalThis as { crypto?: unknown }).crypto;
      }
    }
  });

  it('fetches the seller orders for the pedido selector', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            id_pedido: 1,
            total: '10',
            estado_actual: 'pendiente',
            creado_en: '',
          },
        ],
      },
    });

    await expect(fetchWasteOrders()).resolves.toEqual([
      {
        id_pedido: 1,
        total: '10',
        estado_actual: 'pendiente',
        creado_en: '',
      },
    ]);
    expect(mockApi.get).toHaveBeenCalledWith('/pedidos/', {});
  });

  it('follows pagination for the pedido selector', async () => {
    // The api module is auto-mocked, which stubs isApiUrl (the guard that
    // decides whether a relative `next` may be followed); restore its real
    // semantics so the walk actually advances to page 2.
    jest.mocked(isApiUrl).mockImplementation((url) => url.startsWith('/'));
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id_pedido: 1,
              total: '10',
              estado_actual: 'pendiente',
              creado_en: '',
            },
          ],
          next: '/pedidos/?page=2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id_pedido: 2,
              total: '20',
              estado_actual: 'entregado',
              creado_en: '',
            },
            {
              id_pedido: 3,
              total: '30',
              estado_actual: 'pendiente',
              creado_en: '',
            },
          ],
          next: null,
        },
      });

    // Terminal orders are filtered from EVERY page, not just the first one.
    await expect(fetchWasteOrders()).resolves.toEqual([
      {
        id_pedido: 1,
        total: '10',
        estado_actual: 'pendiente',
        creado_en: '',
      },
      {
        id_pedido: 3,
        total: '30',
        estado_actual: 'pendiente',
        creado_en: '',
      },
    ]);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/pedidos/', {});
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/pedidos/?page=2', {});
  });

  it('fetches current publications for the product selector', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: [{ id_publicacion: 10, productos: [] }] },
    });

    await expect(fetchCurrentPublications()).resolves.toEqual([
      { id_publicacion: 10, productos: [] },
    ]);
    expect(mockApi.get).toHaveBeenCalledWith('/publicaciones/current/');
  });
});
