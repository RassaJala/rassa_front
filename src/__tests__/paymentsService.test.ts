import type { AxiosInstance } from 'axios';

import {
  createPago,
  fetchPago,
  fetchTiposPago,
  type CreatePagoPayload,
  type PaymentDetail,
  type TipoPago,
} from '@/common/payments';

describe('payments service', () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchTiposPago requests /tipos-pago/ and returns the list', async () => {
    const tipos: TipoPago[] = [
      { id_tipo_pago: 1, nombre: 'Efectivo' },
      { id_tipo_pago: 2, nombre: 'Transferencia' },
    ];
    (api.get as jest.Mock).mockResolvedValueOnce({ data: tipos });

    await expect(fetchTiposPago(api)).resolves.toEqual(tipos);
    expect(api.get).toHaveBeenCalledWith('/tipos-pago/');
  });

  it('createPago posts the payload to /pagos/ and returns the payment', async () => {
    const payload: CreatePagoPayload = {
      pedido: 4,
      tipo_pago: 1,
      monto: '119.48',
      referencia: 'TEST-001',
    };
    const pago: PaymentDetail = {
      id_pago: 9,
      folio: 'PAG-0009',
      pedido: 4,
      tipo_pago: 1,
      tipo_pago_nombre: 'Efectivo',
      cliente_nombre: 'Ana Ramírez',
      cliente_id: 4,
      monto: '119.48',
      referencia: 'TEST-001',
      total_pedido: '119.48',
      productos: [],
      fecha_pago: '2026-07-30T12:00:00Z',
    };
    (api.post as jest.Mock).mockResolvedValueOnce({ data: pago });

    await expect(createPago(api, payload)).resolves.toBe(pago);
    expect(api.post).toHaveBeenCalledWith('/pagos/', payload);
  });

  it('fetchPago requests /pagos/:id/ and returns the payment', async () => {
    const pago: PaymentDetail = {
      id_pago: 9,
      folio: 'PAG-0009',
      pedido: 4,
      tipo_pago: 1,
      tipo_pago_nombre: 'Efectivo',
      cliente_nombre: 'Ana Ramírez',
      cliente_id: 4,
      monto: '119.48',
      referencia: '',
      total_pedido: '119.48',
      productos: [],
      fecha_pago: '2026-07-30T12:00:00Z',
    };
    (api.get as jest.Mock).mockResolvedValueOnce({ data: pago });

    await expect(fetchPago(api, 9)).resolves.toBe(pago);
    expect(api.get).toHaveBeenCalledWith('/pagos/9/');
  });
});
