import type { PaymentDetail } from './payments';

/**
 * Fixtures de pagos COMPARTIDOS entre el mobile, la web y el documento.
 * Fuente única (R2-S): las suites ya no divergen con mocks copiados que
 * usan montos distintos (receipt.test tenía 2 productos, las pantallas 1).
 */

/** Pago normal de vendedor: una partida, monto = subtotal = total_pedido. */
export const mockPago: PaymentDetail = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 5,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Test',
  cliente_id: 4,
  monto: '119.48',
  referencia: 'TEST-001',
  total_pedido: '119.48',
  productos: [{ nombre: 'Manzana', precio: '59.74', cantidad: 2 }],
  fecha_pago: '2026-07-30T12:00:00Z',
};

/**
 * Variante con dos partidas (suma 210.98): ejercita reconciliación real con
 * descuento/recargo (monto 119.48 → ajuste −91.50) y la fila informativa
 * Total del pedido. Base de las suites del documento.
 */
export const mockPagoDosProductos: PaymentDetail = {
  ...mockPago,
  productos: [
    { nombre: 'Manzana', precio: '59.74', cantidad: 2 },
    { nombre: 'Plátano', precio: '30.50', cantidad: 3 },
  ],
};
