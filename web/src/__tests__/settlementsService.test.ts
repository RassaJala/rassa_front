import { describe, expect, it, vi } from 'vitest';

import { ESTADO_PAGADA, SETTLEMENTS_MAX_PAGES } from '@/common/settlements';
import type { Settlement, SettlementDetail } from '@/common/settlements';

import api from '../services/api';
import {
  fetchFarmers,
  fetchSettlement,
  fetchSettlements,
  marcarSettlementPagada,
} from '../services/settlements';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);

const liquidacion: Settlement = {
  id_liquidacion: 10,
  agricultor_id: 3,
  agricultor_nombre: 'Juan Pérez',
  periodo_inicio: '2026-07-01',
  periodo_fin: '2026-07-31',
  monto_ventas: '1000.00',
  comision: '100.00',
  monto_liquidar: '900.00',
  estado: 'pendiente',
  creado_en: '2026-08-01T10:00:00-03:00',
};

const detalle: SettlementDetail = {
  ...liquidacion,
  ventas: [
    {
      id_pedido: 5,
      cliente_nombre: 'Ana Gómez',
      total: '500.00',
      creado_en: '2026-07-15T12:00:00-03:00',
      pago_folio: null,
    },
  ],
  pago_liquidacion: null,
};

const farmerRaw = {
  id_usuario: 7,
  email: 'juan@correo.com',
  role: 'farmer',
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: null,
  localidad: null,
  localidad_nombre: null,
  estado: true,
  creado_en: '2026-01-01T09:00:00-03:00',
};

describe('settlements service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('unwraps the envelope and returns the settlement results', async () => {
    mockGet.mockResolvedValue({
      data: {
        ok: true,
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [liquidacion],
        },
      },
    });

    const result = await fetchSettlements();

    expect(mockGet).toHaveBeenCalledWith('/liquidaciones/');
    expect(result).toEqual([liquidacion]);
  });

  it('builds the query string from the filter params', async () => {
    mockGet.mockResolvedValue({
      data: {
        ok: true,
        data: { count: 0, next: null, previous: null, results: [] },
      },
    });

    await fetchSettlements({
      agricultor: 3,
      estado: ESTADO_PAGADA,
      periodo_inicio: '2026-07-01',
      periodo_fin: '2026-07-31',
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/liquidaciones/?agricultor=3&estado=pagada&periodo_inicio=2026-07-01&periodo_fin=2026-07-31',
    );
  });

  it('follows the next links and concatenates every page', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 2,
            next: '/liquidaciones/?page=2',
            previous: null,
            results: [liquidacion],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 2,
            next: null,
            previous: '/liquidaciones/',
            results: [{ ...liquidacion, id_liquidacion: 11 }],
          },
        },
      });

    const result = await fetchSettlements();

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      liquidacion,
      { ...liquidacion, id_liquidacion: 11 },
    ]);
  });

  it('stops following next links at the page cap', async () => {
    mockGet.mockResolvedValue({
      data: {
        ok: true,
        data: {
          count: 100,
          next: '/liquidaciones/?page=2',
          previous: null,
          results: [liquidacion],
        },
      },
    });

    const result = await fetchSettlements();

    expect(mockGet).toHaveBeenCalledTimes(SETTLEMENTS_MAX_PAGES);
    expect(result).toHaveLength(SETTLEMENTS_MAX_PAGES);
  });

  it('rejects when a page has ok:false', async () => {
    mockGet.mockResolvedValue({
      data: { ok: false, message: 'Error del servidor' },
    });

    await expect(fetchSettlements()).rejects.toThrow('Error del servidor');
  });

  it('unwraps the settlement detail envelope', async () => {
    mockGet.mockResolvedValue({ data: { ok: true, data: detalle } });

    const result = await fetchSettlement(10);

    expect(mockGet).toHaveBeenCalledWith('/liquidaciones/10/');
    expect(result).toEqual(detalle);
  });

  it('rejects when the detail envelope has no data', async () => {
    mockGet.mockResolvedValue({ data: { ok: true } });

    await expect(fetchSettlement(10)).rejects.toThrow(
      'Error en la respuesta del servidor',
    );
  });

  it('posts the marcar-pagada body and returns detail plus message', async () => {
    mockPost.mockResolvedValue({
      data: {
        ok: true,
        data: detalle,
        message: 'Liquidación marcada como pagada',
      },
    });

    const result = await marcarSettlementPagada(10, {
      tipo_pago: 2,
      referencia: 'REF-123',
    });

    expect(mockPost).toHaveBeenCalledWith('/liquidaciones/10/marcar-pagada/', {
      tipo_pago: 2,
      referencia: 'REF-123',
    });
    expect(result).toEqual({
      detail: detalle,
      message: 'Liquidación marcada como pagada',
    });
  });

  it('propagates the rejection on an HTTP 400 business error (ok:true)', async () => {
    // The backend answers 400 with an ok:true envelope for business errors.
    // The service must branch on HTTP status (axios rejection), never on
    // envelope.ok, so this rejection must propagate untouched.
    mockPost.mockRejectedValue(
      new Error('Request failed with status code 400'),
    );

    await expect(marcarSettlementPagada(10, { tipo_pago: 2 })).rejects.toThrow(
      'Request failed with status code 400',
    );
  });

  it('fetches active agricultores and maps id_usuario to id', async () => {
    mockGet.mockResolvedValue({
      data: {
        ok: true,
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [farmerRaw],
        },
      },
    });

    const result = await fetchFarmers();

    expect(mockGet).toHaveBeenCalledWith(
      '/admin/usuarios/?rol=Agricultor&estado=true',
    );
    expect(result).toEqual([
      {
        id: 7,
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: null,
        email: 'juan@correo.com',
        role: 'farmer',
        estado: true,
        creado_en: '2026-01-01T09:00:00-03:00',
      },
    ]);
  });
});
