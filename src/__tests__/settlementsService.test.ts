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
    jest.clearAllMocks();
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

      expect(result).toEqual([settlement]);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/liquidaciones/?estado=pendiente',
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

      expect(result).toHaveLength(2);
      expect(result[0]?.id_liquidacion).toBe(1);
      expect(result[1]?.id_liquidacion).toBe(2);
      expect(mockApi.get).toHaveBeenNthCalledWith(1, '/liquidaciones/');
      expect(mockApi.get).toHaveBeenNthCalledWith(2, '/liquidaciones/?page=2');
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
  });

  describe('fetchSettlement', () => {
    it('requests /liquidaciones/{id}/ and unwraps the envelope', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { ok: true, data: detail } });

      await expect(fetchSettlement(7)).resolves.toEqual(detail);
      expect(mockApi.get).toHaveBeenCalledWith('/liquidaciones/7/');
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
    it('requests active agricultores and unwraps the results', async () => {
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

      expect(result).toHaveLength(1);
      expect(result[0]?.id_usuario).toBe(4);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/usuarios/?rol=Agricultor&estado=true',
      );
    });
  });
});
