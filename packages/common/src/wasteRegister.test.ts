import type { PublishedProduct, PublishedPublication } from './wasteRegister';
import {
  filterProductsForOrder,
  isTerminalOrderState,
  listPublishedProducts,
  validateWasteRecord,
  WASTE_DECISION_OPTIONS,
  wasteOrderProductMismatch,
  WASTE_PRODUCT_ORDER_MISMATCH_MESSAGE,
} from './wasteRegister';

describe('WASTE_DECISION_OPTIONS', () => {
  it('snapshot guards the admin-only catalog against drift', () => {
    expect(WASTE_DECISION_OPTIONS).toMatchSnapshot();
  });
});

describe('validateWasteRecord', () => {
  const validValues = {
    pedido: { id_pedido: 1 },
    producto: { id_producto_semanal: 1 },
    cantidad: '2',
    motivo: 'Se venció',
    decision: 1,
  };

  it('rejects comentarios longer than 500 characters', () => {
    const errors = validateWasteRecord({
      ...validValues,
      comentarios: 'a'.repeat(501),
    });
    expect(errors.comentarios).toBe(
      'Los comentarios no pueden superar los 500 caracteres.',
    );
  });

  it('allows comentarios of exactly 500 characters', () => {
    const errors = validateWasteRecord({
      ...validValues,
      comentarios: 'a'.repeat(500),
    });
    expect(errors.comentarios).toBeUndefined();
  });

  it('allows empty or whitespace-only comentarios', () => {
    expect(
      validateWasteRecord({ ...validValues, comentarios: '' }).comentarios,
    ).toBeUndefined();
    expect(
      validateWasteRecord({ ...validValues, comentarios: '   ' }).comentarios,
    ).toBeUndefined();
  });

  it('rejects a stock that is not a number (R3-H)', () => {
    const errors = validateWasteRecord({
      ...validValues,
      stock: '5' as unknown as number,
    });
    expect(errors.stock).toBe('El stock debe ser un número válido.');
  });

  it('rejects a negative or non-finite stock (R3-H)', () => {
    expect(validateWasteRecord({ ...validValues, stock: -1 }).stock).toBe(
      'El stock debe ser un número válido.',
    );
    expect(
      validateWasteRecord({ ...validValues, stock: Number.NaN }).stock,
    ).toBe('El stock debe ser un número válido.');
  });

  it('accepts a non-negative numeric stock and keeps the cantidad cap (R3-H)', () => {
    expect(
      validateWasteRecord({ ...validValues, cantidad: '3', stock: 5 }).stock,
    ).toBeUndefined();
    expect(
      validateWasteRecord({ ...validValues, cantidad: '6', stock: 5 }).cantidad,
    ).toBe('Stock disponible: 5.');
  });
});

describe('isTerminalOrderState', () => {
  it('returns true for terminal states (entregado/cancelado)', () => {
    expect(isTerminalOrderState('entregado')).toBe(true);
    expect(isTerminalOrderState('cancelado')).toBe(true);
  });

  it('returns false for in-flight states', () => {
    expect(isTerminalOrderState('pendiente_entrega')).toBe(false);
    expect(isTerminalOrderState('pendiente')).toBe(false);
    expect(isTerminalOrderState('')).toBe(false);
  });
});

describe('wasteOrderProductMismatch', () => {
  const fieldError = (field: string): unknown => ({
    isAxiosError: true,
    response: {
      status: 400,
      data: { [field]: ['El producto no pertenece al DetallePedido.'] },
    },
  });

  it('returns the clear message when fk_producto_semanal has a field error', () => {
    expect(wasteOrderProductMismatch(fieldError('fk_producto_semanal'))).toBe(
      WASTE_PRODUCT_ORDER_MISMATCH_MESSAGE,
    );
  });

  it('returns the clear message when fk_pedido has a field error', () => {
    expect(wasteOrderProductMismatch(fieldError('fk_pedido'))).toBe(
      WASTE_PRODUCT_ORDER_MISMATCH_MESSAGE,
    );
  });

  it('returns null when the error is unrelated to the order-product link', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { cantidad: ['No puede ser mayor al stock disponible.'] },
      },
    };
    expect(wasteOrderProductMismatch(error)).toBeNull();
  });

  it('returns null for non-axios errors', () => {
    expect(wasteOrderProductMismatch(new Error('boom'))).toBeNull();
  });
});

describe('filterProductsForOrder', () => {
  const tomate: PublishedProduct = {
    id_producto_semanal: 100,
    producto: 'Tomate',
    unidad: 'kg',
    stock: 5,
    precio: '120',
    foto: '',
  };
  const papa: PublishedProduct = {
    id_producto_semanal: 101,
    producto: 'Papa',
    unidad: 'kg',
    stock: 3,
    precio: '60',
    foto: '',
  };

  it('returns all products when the order carries no product list', () => {
    expect(filterProductsForOrder([tomate, papa], null)).toEqual([
      tomate,
      papa,
    ]);
    expect(filterProductsForOrder([tomate, papa], undefined)).toEqual([
      tomate,
      papa,
    ]);
    expect(filterProductsForOrder([tomate, papa], { productos: [] })).toEqual([
      tomate,
      papa,
    ]);
  });

  it('keeps only the products present in the order, case-insensitive', () => {
    expect(
      filterProductsForOrder([tomate, papa], { productos: ['TOMATE'] }),
    ).toEqual([tomate]);
  });

  it('returns an empty list when no publication product matches the order', () => {
    expect(
      filterProductsForOrder([tomate, papa], { productos: ['Lechuga'] }),
    ).toEqual([]);
  });

  it('does NOT filter when the order product list is truncated (has_more_productos)', () => {
    // The backend caps `productos` at PRODUCTOS_PREVIEW_LIMIT (3) and marks the
    // preview as truncated. Filtering by an incomplete list would wrongly drop
    // products that do belong to the order but were cut off, so the full list
    // must be kept.
    expect(
      filterProductsForOrder([tomate, papa], {
        productos: ['Tomate'],
        has_more_productos: true,
      }),
    ).toEqual([tomate, papa]);
  });

  it('filters normally when the order product list is complete (has_more_productos false)', () => {
    expect(
      filterProductsForOrder([tomate, papa], {
        productos: ['TOMATE'],
        has_more_productos: false,
      }),
    ).toEqual([tomate]);
  });
});

describe('listPublishedProducts', () => {
  const tomate: PublishedProduct = {
    id_producto_semanal: 100,
    producto: 'Tomate',
    unidad: 'kg',
    stock: 5,
    precio: '120',
    foto: '',
  };
  const papa: PublishedProduct = {
    id_producto_semanal: 101,
    producto: 'Papa',
    unidad: 'kg',
    stock: 3,
    precio: '60',
    foto: '',
  };
  const publications: PublishedPublication[] = [
    {
      id_publicacion: 1,
      agricultor: null,
      fecha_publicacion: '',
      semana: '',
      productos: [tomate, papa],
    },
    {
      id_publicacion: 2,
      agricultor: null,
      fecha_publicacion: '',
      semana: '',
      productos: [tomate],
    },
  ];

  it('dedupes products shared by multiple publications, keeping the first', () => {
    expect(listPublishedProducts(publications)).toEqual([tomate, papa]);
  });

  it('drops products without stock', () => {
    const sinStock = { ...tomate, stock: 0 };
    expect(
      listPublishedProducts([
        { ...publications[0]!, productos: [sinStock, papa] },
      ]),
    ).toEqual([papa]);
  });

  it('returns an empty list when there are no publications', () => {
    expect(listPublishedProducts([])).toEqual([]);
  });
});
