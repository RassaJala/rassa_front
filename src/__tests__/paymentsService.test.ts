import type { AxiosInstance } from 'axios';

import {
  createPago,
  esPropietarioPago,
  fetchPago,
  fetchPagoPorPedido,
  fetchPagos,
  fetchTiposPago,
  formatearMonto,
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

  it('fetchPagoPorPedido requests /pagos/?pedido= and returns the first payment (paginated)', async () => {
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
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { results: [pago] } });

    await expect(fetchPagoPorPedido(api, 4)).resolves.toBe(pago);
    expect(api.get).toHaveBeenCalledWith('/pagos/?pedido=4');
  });

  it('fetchPagoPorPedido returns the first payment from a flat array response', async () => {
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
    (api.get as jest.Mock).mockResolvedValueOnce({ data: [pago] });

    await expect(fetchPagoPorPedido(api, 4)).resolves.toBe(pago);
  });

  it('fetchPagoPorPedido returns null when the order has no payment', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { results: [] } });

    await expect(fetchPagoPorPedido(api, 4)).resolves.toBeNull();
  });

  it('fetchPagoPorPedido returns null when the backend responds null', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: null });

    await expect(fetchPagoPorPedido(api, 4)).resolves.toBeNull();
  });

  it('fetchPagoPorPedido returns null when results is not an array', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { results: { count: 1 } },
    });

    await expect(fetchPagoPorPedido(api, 4)).resolves.toBeNull();
  });

  it('fetchPagos requests /pagos/ and returns a flat array untouched', async () => {
    const pagos: PaymentDetail[] = [
      {
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
      },
    ];
    (api.get as jest.Mock).mockResolvedValueOnce({ data: pagos });

    await expect(fetchPagos(api)).resolves.toEqual(pagos);
    expect(api.get).toHaveBeenCalledWith('/pagos/');
  });

  it('fetchPagos unwraps the results of a paginated (DRF) response', async () => {
    const pagos: PaymentDetail[] = [
      {
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
      },
    ];
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { count: 1, next: null, previous: null, results: pagos },
    });

    await expect(fetchPagos(api)).resolves.toEqual(pagos);
  });

  it('fetchPagos returns an empty list for a paginated response with no results', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { count: 0, next: null, previous: null, results: [] },
    });

    await expect(fetchPagos(api)).resolves.toEqual([]);
  });

  it('fetchPagos returns an empty list for an invalid payload', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: null });

    await expect(fetchPagos(api)).resolves.toEqual([]);
  });

  it('fetchPagos returns an empty list when results is an object, not an array', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { results: { count: 1 } },
    });

    await expect(fetchPagos(api)).resolves.toEqual([]);
  });

  describe('formatearMonto', () => {
    it('formats a finite number with $ and two decimals, rounding', () => {
      expect(formatearMonto(119.478)).toBe('$119.48');
    });

    it('returns — for NaN', () => {
      expect(formatearMonto(NaN)).toBe('—');
    });

    it('returns — for a non-numeric string', () => {
      expect(formatearMonto('12,50')).toBe('—');
    });

    it.each([[undefined], [null]])('returns — for %s', (valor) => {
      expect(formatearMonto(valor)).toBe('—');
    });
  });

  describe('esPropietarioPago', () => {
    it('returns false when pago is null', () => {
      expect(esPropietarioPago(null, 4)).toBe(false);
    });

    it('returns false when pago has cliente_id null', () => {
      expect(esPropietarioPago({ cliente_id: null }, 4)).toBe(false);
    });

    it('returns false when user is undefined', () => {
      expect(esPropietarioPago({ cliente_id: 4 }, undefined)).toBe(false);
    });

    it('returns true when cliente_id matches userId', () => {
      expect(esPropietarioPago({ cliente_id: 4 }, 4)).toBe(true);
    });

    it('returns false when cliente_id differs from userId', () => {
      expect(esPropietarioPago({ cliente_id: 4 }, 99)).toBe(false);
    });
  });
});
