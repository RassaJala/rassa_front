/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  fetchFarmers,
  fetchSettlement,
  fetchSettlements,
  marcarSettlementPagada,
} from '@/services/settlements';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;

const settlement = {
  id_liquidacion: 1,
  agricultor_id: 4,
  agricultor_nombre: 'Ana Ramírez',
  periodo_inicio: '2026-07-06',
  periodo_fin: '2026-07-12',
  monto_ventas: '1500.00',
  comision: '150.00',
  monto_liquidar: '1350.00',
  estado: 'pendiente' as const,
  creado_en: '2026-07-13T08:00:00-03:00',
};

const detail = {
  ...settlement,
  ventas: [
    {
      id_pedido: 11,
      cliente_nombre: 'Cliente Uno',
      total: '800.00',
      creado_en: '2026-07-08T10:00:00-03:00',
      pago_folio: null,
    },
  ],
  pago_liquidacion: null,
};

describe('settlements service (mobile)', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks): the 25-page cap test queues
    // mockResolvedValueOnce values that clearAllMocks would leave behind.
    jest.resetAllMocks();
    // Deterministic origin for the isSafeNextUrl same-origin checks (R3-001):
    // DRF emits `next` as an absolute URL, so the guard compares its origin
    // against the api instance's baseURL.
    mockApi.defaults = {
      baseURL: 'http://localhost:8000/api',
    } as typeof mockApi.defaults;
  });

  describe('fetchSettlements', () => {
    it('requests the filtered URL and unwraps a single page', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [settlement],
          },
        },
      });

      const result = await fetchSettlements({ estado: 'pendiente' });

      expect(result).toEqual({
        items: [settlement],
        count: 1,
        truncated: false,
      });
      expect(mockApi.get).toHaveBeenCalledWith(
        '/liquidaciones/?estado=pendiente',
        expect.anything(),
      );
    });

    it('concatenates pages by following the next link (multi-page fetch-all)', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 2,
              next: '/liquidaciones/?page=2',
              previous: null,
              results: [settlement],
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
              results: [{ ...settlement, id_liquidacion: 2 }],
            },
          },
        });

      const result = await fetchSettlements();

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id_liquidacion).toBe(1);
      expect(result.items[1]?.id_liquidacion).toBe(2);
      expect(result.count).toBe(2);
      expect(result.truncated).toBe(false);
      expect(mockApi.get).toHaveBeenNthCalledWith(
        1,
        '/liquidaciones/',
        expect.anything(),
      );
      expect(mockApi.get).toHaveBeenNthCalledWith(
        2,
        '/liquidaciones/?page=2',
        expect.anything(),
      );
    });

    it('rejects when the backend answers a business error with ok:true on HTTP 400', async () => {
      mockApi.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { ok: true, message: 'Periodo inválido' },
        },
      });

      await expect(
        fetchSettlements({ periodo_inicio: 'no-es-fecha' }),
      ).rejects.toMatchObject({ response: { status: 400 } });
    });

    it('caps the walk at SETTLEMENTS_MAX_PAGES and reports truncated', async () => {
      // 25 pages exist server-side but the walk stops at the cap (20):
      // 20 items accumulated, the first-page count kept, truncated true.
      for (let page = 1; page <= 25; page++) {
        mockApi.get.mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 25,
              next: page < 25 ? `/liquidaciones/?page=${page + 1}` : null,
              previous: null,
              results: [{ ...settlement, id_liquidacion: page }],
            },
          },
        });
      }

      const result = await fetchSettlements();

      expect(result.items).toHaveLength(20);
      expect(result.items[19]?.id_liquidacion).toBe(20);
      expect(result.count).toBe(25);
      expect(result.truncated).toBe(true);
    });

    it('returns partial items with truncated=true when a later page fails', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 5,
              next: '/liquidaciones/?page=2',
              previous: null,
              results: [settlement],
            },
          },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 500 },
        });

      const result = await fetchSettlements();

      expect(result.items).toEqual([settlement]);
      expect(result.count).toBe(5);
      expect(result.truncated).toBe(true);
    });

    it('R1-1: never follows an unsafe protocol-relative next URL (JWT guard)', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 1,
            next: '//evil.example/steal',
            previous: null,
            results: [settlement],
          },
        },
      });

      const result = await fetchSettlements();

      // The collected page is kept, the walk is marked truncated and the
      // unsafe URL is never requested (the api instance would otherwise send
      // the JWT to the external origin).
      expect(result.items).toEqual([settlement]);
      expect(result.count).toBe(1);
      expect(result.truncated).toBe(true);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).not.toHaveBeenCalledWith(
        '//evil.example/steal',
        expect.anything(),
      );
    });

    it('R3-001: follows an absolute next URL on the SAME origin (DRF emits absolute next links)', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 2,
              next: 'http://localhost:8000/api/liquidaciones/?page=2',
              previous: null,
              results: [settlement],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 2,
              next: null,
              previous: 'http://localhost:8000/api/liquidaciones/',
              results: [{ ...settlement, id_liquidacion: 2 }],
            },
          },
        });

      const result = await fetchSettlements();

      // Page 1's absolute URL matches the api origin, so the walk continues:
      // both pages are fetched, items accumulate and the walk is NOT truncated.
      expect(result.items).toHaveLength(2);
      expect(result.items[1]?.id_liquidacion).toBe(2);
      expect(result.count).toBe(2);
      expect(result.truncated).toBe(false);
      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(mockApi.get).toHaveBeenNthCalledWith(
        2,
        'http://localhost:8000/api/liquidaciones/?page=2',
        expect.anything(),
      );
    });

    it('R3-001: never follows an absolute next URL on a DIFFERENT origin (JWT guard)', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 1,
            next: 'https://evil.example/steal?page=2',
            previous: null,
            results: [settlement],
          },
        },
      });

      const result = await fetchSettlements();

      // Cross-origin absolute URLs are as unsafe as protocol-relative ones:
      // the walk stops after page 1, the result is truncated and the external
      // URL is never requested (the JWT would leak to the evil origin).
      expect(result.items).toEqual([settlement]);
      expect(result.count).toBe(1);
      expect(result.truncated).toBe(true);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).not.toHaveBeenCalledWith(
        'https://evil.example/steal?page=2',
        expect.anything(),
      );
    });

    it('passes the abort signal to every api.get call', async () => {
      const controller = new AbortController();
      mockApi.get.mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [settlement],
          },
        },
      });

      await fetchSettlements({}, controller.signal);

      expect(mockApi.get).toHaveBeenCalledWith('/liquidaciones/', {
        signal: controller.signal,
      });
    });
  });

  describe('fetchSettlement', () => {
    it('requests /liquidaciones/{id}/ and unwraps the envelope', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { ok: true, data: detail } });

      await expect(fetchSettlement(7)).resolves.toEqual(detail);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/liquidaciones/7/',
        expect.anything(),
      );
    });

    it('passes the abort signal to the detail request', async () => {
      const controller = new AbortController();
      mockApi.get.mockResolvedValueOnce({ data: { ok: true, data: detail } });

      await fetchSettlement(7, controller.signal);

      expect(mockApi.get).toHaveBeenCalledWith('/liquidaciones/7/', {
        signal: controller.signal,
      });
    });
  });

  describe('marcarSettlementPagada', () => {
    it('posts the tipo_pago and referencia body and returns detail + message', async () => {
      const paidDetail = {
        ...detail,
        estado: 'pagada' as const,
        pago_liquidacion: {
          id_pago: 30,
          folio: 'LIQ-2026-0001',
          tipo_pago_nombre: 'Transferencia',
          monto: '1350.00',
          referencia: 'REF-001',
          fecha_pago: '2026-07-13T12:00:00-03:00',
        },
      };
      mockApi.post.mockResolvedValueOnce({
        data: {
          ok: true,
          message: 'Liquidación marcada como pagada',
          data: paidDetail,
        },
      });

      const result = await marcarSettlementPagada(7, {
        tipo_pago: 2,
        referencia: 'REF-001',
      });

      expect(result).toEqual({
        detail: paidDetail,
        message: 'Liquidación marcada como pagada',
      });
      expect(mockApi.post).toHaveBeenCalledWith(
        '/liquidaciones/7/marcar-pagada/',
        {
          tipo_pago: 2,
          referencia: 'REF-001',
        },
      );
    });

    it('accepts a body without referencia', async () => {
      const paidDetail = {
        ...detail,
        estado: 'pagada' as const,
        pago_liquidacion: {
          id_pago: 31,
          folio: 'LIQ-2026-0002',
          tipo_pago_nombre: 'Efectivo',
          monto: '1350.00',
          referencia: '',
          fecha_pago: '2026-07-13T12:00:00-03:00',
        },
      };
      mockApi.post.mockResolvedValueOnce({
        data: { ok: true, message: 'ok', data: paidDetail },
      });

      const result = await marcarSettlementPagada(8, { tipo_pago: 1 });

      expect(result.detail.estado).toBe('pagada');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/liquidaciones/8/marcar-pagada/',
        { tipo_pago: 1 },
      );
    });
  });

  describe('fetchFarmers', () => {
    it('R1-3: reduces AdminUser pages to the minimal FarmerOption shape', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id_usuario: 4,
                email: 'ana@rassa.com',
                role: 'farmer',
                nombre: 'Ana',
                apellido_paterno: 'Ramírez',
                apellido_materno: null,
                localidad: 1,
                localidad_nombre: 'Localidad',
                estado: true,
                creado_en: '2026-01-01T00:00:00-03:00',
              },
            ],
          },
        },
      });

      const result = await fetchFarmers();

      // Only id + display name survives: the PII (email, localidad, ...) is
      // stripped before the settlements screens ever see it.
      expect(result).toEqual([{ id_usuario: 4, nombre: 'Ana Ramírez' }]);
      expect(result[0]).not.toHaveProperty('email');
      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/usuarios/?rol=Agricultor&estado=true',
        expect.anything(),
      );
    });

    it('R3-002: rejects when a later page fails (all-or-nothing farmers)', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            data: {
              count: 2,
              next: '/admin/usuarios/?rol=Agricultor&estado=true&page=2',
              previous: null,
              results: [
                {
                  id_usuario: 4,
                  email: 'ana@rassa.com',
                  role: 'farmer',
                  nombre: 'Ana',
                  apellido_paterno: 'Ramírez',
                  apellido_materno: null,
                  localidad: 1,
                  localidad_nombre: 'Localidad',
                  estado: true,
                  creado_en: '2026-01-01T00:00:00-03:00',
                },
              ],
            },
          },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 500 },
        });

      // A mid-chain failure must NOT resolve to a partial dropdown: the error
      // surfaces so the FarmerPickerModal can show its error+retry state.
      await expect(fetchFarmers()).rejects.toThrow(
        'No se pudieron cargar todos los agricultores',
      );
    });
  });
});
