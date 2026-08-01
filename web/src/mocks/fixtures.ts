import type { Pedido } from '../services/orderTypes';

// S-6: single source of truth for the POST /pedidos/ success fixture (order
// #45) — shared by mocks/handlers.ts, services/orders.test.ts and the checkout
// integration tests. A change to the wire contract must be made here only.

export const PEDIDO_45: Pedido = {
  id_pedido: 45,
  cliente_nombre: 'Cliente Demo',
  estado: 'pendiente',
  subtotal: '25.00',
  iva: '5.25',
  total: '30.25',
  detalles: [],
  creado_en: '2026-07-31T13:00:00Z',
};
