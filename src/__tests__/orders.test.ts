import api from '@/services/api';
import {
  createOrder,
  findMatchingOrder,
  findOrderByRecord,
  InvalidOrderEnvelopeError,
} from '@/services/orders';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockGet = api.get as jest.MockedFunction<typeof api.get>;

describe('createOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('envía el payload a /pedidos/ y devuelve el pedido interno desenvuelto', async () => {
    const envelope = {
      ok: true,
      message: 'Pedido creado correctamente.',
      data: {
        id_pedido: 34,
        cliente_nombre: 'Ana Ramírez',
        estado: 'pendiente',
        subtotal: '25.00',
        iva: '5.25',
        total: '30.25',
        detalles: [
          {
            id_detalle: 56,
            fk_producto_semanal: 1,
            nombre_producto: 'Tomate Saladet',
            precio_unitario: '25.00',
            cantidad: 1,
            importe: '25.00',
          },
        ],
        creado_en: '2026-07-31T00:25:10Z',
      },
    };
    mockPost.mockResolvedValue({ data: envelope } as never);

    const result = await createOrder({
      items: [{ id_producto_semanal: 1, cantidad: 1 }],
    });

    expect(mockPost).toHaveBeenCalledWith('/pedidos/', {
      items: [{ id_producto_semanal: 1, cantidad: 1 }],
    });
    expect(result).toEqual(envelope.data);
    expect(result.id_pedido).toBe(34);
    expect(result.total).toBe('30.25');
  });

  it('rechaza con InvalidOrderEnvelopeError cuando data.data falta', async () => {
    mockPost.mockResolvedValue({
      data: {
        ok: true,
        message: 'Pedido creado correctamente.',
        data: undefined,
      },
    } as never);

    await expect(
      createOrder({ items: [{ id_producto_semanal: 1, cantidad: 1 }] }),
    ).rejects.toThrow(InvalidOrderEnvelopeError);
  });

  it('rechaza con InvalidOrderEnvelopeError cuando data.data no es un pedido válido', async () => {
    mockPost.mockResolvedValue({
      data: { ok: true, message: '', data: {} },
    } as never);

    await expect(
      createOrder({ items: [{ id_producto_semanal: 1, cantidad: 1 }] }),
    ).rejects.toThrow(InvalidOrderEnvelopeError);
  });

  it('envía el header Idempotency-Key al POST cuando se provee una clave', async () => {
    mockPost.mockResolvedValue({
      data: {
        ok: true,
        message: 'Pedido creado correctamente.',
        data: {
          id_pedido: 34,
          cliente_nombre: 'Ana Ramírez',
          estado: 'pendiente',
          subtotal: '25.00',
          iva: '5.25',
          total: '30.25',
          detalles: [],
          creado_en: '2026-07-31T00:25:10Z',
        },
      },
    } as never);

    await createOrder(
      { items: [{ id_producto_semanal: 1, cantidad: 1 }] },
      'checkout-abc123',
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/pedidos/',
      { items: [{ id_producto_semanal: 1, cantidad: 1 }] },
      { headers: { 'Idempotency-Key': 'checkout-abc123' } },
    );
  });
});

describe('findMatchingOrder', () => {
  const payload = { items: [{ id_producto_semanal: 1, cantidad: 2 }] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockListResults(results: unknown[]): void {
    mockGet.mockResolvedValue({ data: { results } } as never);
  }

  it('devuelve la orden reciente pendiente que coincide por total y productos', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 45,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        productos: ['Tomate', 'Lechuga'],
        has_more_productos: false,
        total: '9.68',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);

    const result = await findMatchingOrder(payload, 9.68, [
      'Tomate',
      'Lechuga',
    ]);

    expect(result).not.toBeNull();
    expect(result?.id_pedido).toBe(45);
    expect(result?.total).toBe('9.68');
    expect(result?.estado_actual).toBe('pendiente');
  });

  it('devuelve null cuando no hay órdenes dentro de la ventana de 60s', async () => {
    const oldIso = new Date(Date.now() - 120_000).toISOString();
    mockListResults([
      {
        id_pedido: 46,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        productos: ['Tomate'],
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: oldIso,
      },
    ]);

    const result = await findMatchingOrder(payload, 5.0, ['Tomate']);

    expect(result).toBeNull();
  });

  it('devuelve null cuando la orden no está pendiente', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 47,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        productos: ['Tomate'],
        total: '5.00',
        estado_actual: 'confirmado',
        creado_en: iso,
      },
    ]);

    const result = await findMatchingOrder(payload, 5.0, ['Tomate']);

    expect(result).toBeNull();
  });

  it('devuelve null cuando el total no coincide', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 48,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        productos: ['Tomate'],
        total: '15.00',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);

    const result = await findMatchingOrder(payload, 5.0, ['Tomate']);

    expect(result).toBeNull();
  });

  it('empareja por total y ventana cuando la orden no trae productos', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 49,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);

    const result = await findMatchingOrder(payload, 5.0, ['Tomate']);

    expect(result?.id_pedido).toBe(49);
  });

  it('devuelve null cuando los nombres de producto no coinciden', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 50,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        productos: ['Tomate', 'Cebolla'],
        total: '9.68',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);

    const result = await findMatchingOrder(payload, 9.68, [
      'Tomate',
      'Lechuga',
    ]);

    expect(result).toBeNull();
  });

  it('no llama al API y devuelve null con payload vacío', async () => {
    const result = await findMatchingOrder({ items: [] }, 0, []);

    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('propaga el error del listado de pedidos', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    await expect(findMatchingOrder(payload, 5.0, ['Tomate'])).rejects.toThrow(
      'network down',
    );
  });
});

describe('findOrderByRecord', () => {
  const input = {
    payload: { items: [{ id_producto_semanal: 1, cantidad: 2 }] },
    productNames: ['Tomate'],
    total: 5.0,
  };

  function mockListResults(results: unknown[]): void {
    mockGet.mockResolvedValue({ data: { results } } as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('JD-B-001: empareja un pedido más viejo que la ventana de 60s usando ítems del registro', async () => {
    const oldIso = new Date(Date.now() - 3_600_000).toISOString(); // 1 hora atrás
    // First call: the order list.
    mockGet.mockResolvedValueOnce({
      data: {
        results: [
          {
            id_pedido: 60,
            cliente_nombre: 'Ana Ramírez',
            vendedor_nombre: null,
            total: '5.00',
            estado_actual: 'pendiente',
            creado_en: oldIso,
          },
        ],
      },
    } as never);
    // Second call: the detail endpoint.
    mockGet.mockResolvedValueOnce({
      data: {
        id_pedido: 60,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: oldIso,
        detalles: [
          {
            id_detalle: 1,
            nombre_producto: 'Tomate',
            precio_unitario: '2.50',
            cantidad: 2,
            importe: '5.00',
          },
        ],
      },
    } as never);

    const result = await findOrderByRecord(input);

    expect(result).not.toBeNull();
    expect(result?.id_pedido).toBe(60);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenLastCalledWith('/pedidos/60/');
  });

  it('devuelve null cuando los ítems del detalle no coinciden con el registro', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 61,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);
    mockGet.mockResolvedValueOnce({
      data: {
        id_pedido: 61,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: iso,
        detalles: [
          {
            id_detalle: 1,
            nombre_producto: 'Lechuga',
            precio_unitario: '5.00',
            cantidad: 1,
            importe: '5.00',
          },
        ],
      },
    } as never);

    const result = await findOrderByRecord(input);

    expect(result).toBeNull();
  });

  it('devuelve null cuando la orden no está pendiente', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 62,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'confirmado',
        creado_en: iso,
      },
    ]);

    const result = await findOrderByRecord(input);

    expect(result).toBeNull();
  });

  it('devuelve null cuando el total no coincide', async () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    mockListResults([
      {
        id_pedido: 63,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '15.00',
        estado_actual: 'pendiente',
        creado_en: iso,
      },
    ]);

    const result = await findOrderByRecord(input);

    expect(result).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1); // detail never fetched
  });

  it('no llama al API y devuelve null con payload vacío', async () => {
    const result = await findOrderByRecord({
      payload: { items: [] },
      productNames: [],
      total: 0,
    });

    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('propaga el error del listado de pedidos', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    await expect(findOrderByRecord(input)).rejects.toThrow('network down');
  });
});
