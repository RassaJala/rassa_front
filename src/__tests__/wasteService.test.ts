/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  createWasteRecord,
  fetchCurrentPublications,
  fetchMermaResumen,
  fetchWasteDecisions,
  fetchWasteOrders,
} from '@/services/waste';
import api from '@/services/api';

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

  it('normalizes decisions from a paginated {results} envelope', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { results: [{ id_decision: 1, decision: 'Donar' }] } },
    });

    await expect(fetchWasteDecisions()).resolves.toEqual([
      { id_decision: 1, decision: 'Donar' },
    ]);
    expect(mockApi.get).toHaveBeenCalledWith('/decisiones-merma/');
  });

  it('normalizes decisions from a bare array response', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: [{ id_decision: 2, decision: 'Desechar' }] },
    });

    await expect(fetchWasteDecisions()).resolves.toEqual([
      { id_decision: 2, decision: 'Desechar' },
    ]);
  });

  it('returns an empty list when the decision payload is missing', async () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });

    await expect(fetchWasteDecisions()).resolves.toEqual([]);
  });

  it('posts a waste record with the full payload', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { data: { id_merma: 1, cantidad: 2 } },
    });

    await createWasteRecord({
      fk_producto_semanal: 100,
      fk_pedido: 7,
      cantidad: 2,
      motivo: 'Se venció',
      fk_decision: 1,
      comentarios: 'nota',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/mermas/', {
      fk_producto_semanal: 100,
      fk_pedido: 7,
      cantidad: 2,
      motivo: 'Se venció',
      fk_decision: 1,
      comentarios: 'nota',
    });
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
    expect(mockApi.get).toHaveBeenCalledWith('/pedidos/');
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
