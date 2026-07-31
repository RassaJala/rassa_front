/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import { fetchMermaResumen } from '@/services/waste';
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
