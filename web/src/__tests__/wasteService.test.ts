import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import api from '../services/api';
import { fetchMermaResumen } from '../services/waste';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}));

const mockGet = api.get as unknown as Mock;

const resumen = {
  agrupacion: 'mes',
  total_general: 10,
  producto_mas_afectado: null,
  detalle: [],
};

describe('waste service (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps the envelope and returns data on ok: true', async () => {
    mockGet.mockResolvedValueOnce({ data: { ok: true, data: resumen } });

    await expect(fetchMermaResumen()).resolves.toEqual(resumen);
    expect(mockGet).toHaveBeenCalledWith('/mermas/resumen/');
  });

  it('throws when the backend responds with ok: false', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ok: false, message: 'No autorizado' },
    });

    await expect(fetchMermaResumen()).rejects.toThrow('No autorizado');
  });

  it('throws when data is missing from the envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { ok: true } });

    await expect(fetchMermaResumen()).rejects.toThrow(
      'Error en la respuesta del servidor',
    );
  });

  it('builds the resumen query params for the backend', async () => {
    mockGet.mockResolvedValueOnce({ data: { ok: true, data: resumen } });

    await fetchMermaResumen({
      fecha_desde: '2026-07-01',
      fecha_hasta: '2026-07-31',
      producto_id: 2,
      agrupar_por: 'mes',
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/mermas/resumen/?fecha_desde=2026-07-01&fecha_hasta=2026-07-31&producto_id=2&agrupar_por=mes',
    );
  });
});
