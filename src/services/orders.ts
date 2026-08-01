import type { ApiResponse, Order, OrderItem, PedidoEstado } from '@/types';

import api from './api';

// ── Types ────────────────────────────────────────────────

export interface CreateOrderItem {
  id_producto_semanal: number;
  cantidad: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
}

export interface PedidoDetalle extends OrderItem {
  fk_producto_semanal: number;
}

/**
 * Shape returned by POST /pedidos/. The creation serializer outputs `estado`,
 * while the list/detail serializers output `estado_actual` (see `Order` in
 * @/types). The field-name difference is a backend contract, which is why this
 * type is not merged into `Order`.
 */
export interface Pedido {
  id_pedido: number;
  cliente_nombre: string;
  estado: PedidoEstado;
  subtotal: string;
  iva: string;
  total: string;
  detalles: PedidoDetalle[];
  creado_en: string;
}

// ── API calls ────────────────────────────────────────────

/**
 * Thrown when the order POST resolves with a 2xx but the response envelope is
 * unreadable (missing/invalid `data`). The order may still exist server-side,
 * so callers should treat it like an ambiguous failure and reconcile.
 */
export class InvalidOrderEnvelopeError extends Error {
  constructor() {
    super('Invalid order response envelope');
    this.name = 'InvalidOrderEnvelopeError';
  }
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<Pedido> {
  // Backend envuelve la respuesta: { ok, message, data: Pedido }
  const { data } = await api.post<ApiResponse<Pedido>>('/pedidos/', payload);
  const order = data?.data;
  if (!order || typeof order.id_pedido !== 'number') {
    throw new InvalidOrderEnvelopeError();
  }
  return order;
}

// ── Reconciliation ────────────────────────────────────────

/**
 * Window for reconciling ambiguous order creation failures. The axios timeout
 * is 15s and a 401-triggered token refresh can retry the request, so 60s leaves
 * margin for the created order to appear on the list while keeping unrelated
 * older orders out of the match.
 */
const RECONCILE_WINDOW_MS = 60_000;

interface OrderListItem {
  id_pedido: number;
  cliente_nombre: string | null;
  vendedor_nombre: string | null;
  productos?: string[];
  has_more_productos?: boolean;
  total: string;
  estado_actual: PedidoEstado;
  creado_en: string;
}

/**
 * After an ambiguous POST /pedidos/ failure (timeout/network, no HTTP
 * response), the order may still have been created server-side. This queries
 * the order list and returns the order that matches the expected total and
 * product names, or null when no match exists.
 */
export async function findMatchingOrder(
  payload: CreateOrderPayload,
  expectedTotal: number,
  productNames: string[],
): Promise<Order | null> {
  // An empty payload never creates an order server-side.
  if (payload.items.length === 0) {
    return null;
  }

  const response = await api.get<{ results?: OrderListItem[] }>('/pedidos/');

  for (const candidate of response.data.results ?? []) {
    if (!isRecentPendiente(candidate)) continue;
    if (!totalsMatch(candidate.total, expectedTotal)) continue;
    if (!hasMatchingProducts(candidate, productNames)) continue;
    return toOrder(candidate);
  }

  return null;
}

function isRecentPendiente(candidate: OrderListItem): boolean {
  if (candidate.estado_actual !== 'pendiente') return false;
  const created = new Date(candidate.creado_en).getTime();
  return !Number.isNaN(created) && Date.now() - created <= RECONCILE_WINDOW_MS;
}

function totalsMatch(candidateTotal: string, expectedTotal: number): boolean {
  return Math.abs(Number.parseFloat(candidateTotal) - expectedTotal) < 0.01;
}

function hasMatchingProducts(
  candidate: OrderListItem,
  expectedNames: string[],
): boolean {
  if (expectedNames.length === 0) return true;
  const actualNames = candidate.productos;
  if (actualNames === undefined || actualNames.length === 0) return true;

  // The backend returns the first 3 product names in creation order, which
  // equals the cart order, so compare the first expectedNames.length names.
  const actualPrefix = actualNames.slice(0, expectedNames.length);
  if (actualPrefix.length !== expectedNames.length) return false;

  const expectedSet = new Set(expectedNames.map((name) => name.trim()));
  return actualPrefix.every((name) => expectedSet.has(name.trim()));
}

function toOrder(candidate: OrderListItem): Order {
  return {
    id_pedido: candidate.id_pedido,
    cliente_nombre: candidate.cliente_nombre,
    vendedor_nombre: candidate.vendedor_nombre,
    total: candidate.total,
    estado_actual: candidate.estado_actual,
    creado_en: candidate.creado_en,
  };
}
