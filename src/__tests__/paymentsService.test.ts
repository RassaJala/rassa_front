import type { AxiosInstance } from 'axios';

import {
  calcularImporte,
  calcularSubtotal,
  createPago,
  esPagoIdValido,
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

  it('fetchPagos throws when the backend responds null', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: null });

    await expect(fetchPagos(api)).rejects.toThrow(
      'La respuesta del servidor es null al listar pagos',
    );
  });

  it('fetchPagos throws when results is an object, not an array', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { results: { count: 1 } },
    });

    await expect(fetchPagos(api)).rejects.toThrow(
      "El campo 'results' no es una lista al listar pagos",
    );
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

  describe('esPagoIdValido', () => {
    it.each([1, 42])('returns true for positive integer %d', (valor) => {
      expect(esPagoIdValido(valor)).toBe(true);
    });

    it.each([0, -5, 1.5, NaN])('returns false for %s', (valor) => {
      expect(esPagoIdValido(valor)).toBe(false);
    });

    it.each([[undefined], [null]])('returns false for %s', (valor) => {
      expect(esPagoIdValido(valor)).toBe(false);
    });
  });

  describe('calcularImporte', () => {
    it('multiplies cantidad by a numeric precio', () => {
      expect(calcularImporte({ cantidad: 3, precio: 2.5 })).toBe(7.5);
    });

    it('returns 0 when cantidad is null', () => {
      expect(calcularImporte({ cantidad: null, precio: 2.5 })).toBe(0);
    });

    it('parses a string precio', () => {
      expect(calcularImporte({ cantidad: 2, precio: '10.5' })).toBe(21);
    });

    it('returns 0 when cantidad and precio are null', () => {
      expect(calcularImporte({ cantidad: null, precio: null })).toBe(0);
    });
  });

  describe('calcularSubtotal', () => {
    it('sums multiple line items', () => {
      const partidas = [
        { cantidad: 2, precio: 2.5 },
        { cantidad: 1, precio: '10.5' },
      ];
      expect(calcularSubtotal(partidas)).toBe(15.5);
    });

    it('returns 0 for an empty list', () => {
      expect(calcularSubtotal([])).toBe(0);
    });

    it('does not crash when line items have nulls', () => {
      const partidas = [
        { cantidad: null, precio: null },
        { cantidad: 2, precio: '10.5' },
        { cantidad: 3, precio: null },
      ];
      expect(calcularSubtotal(partidas)).toBe(21);
    });
  });
});
