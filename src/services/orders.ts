import type {
  ApiResponse,
  Order,
  OrderDetail,
  OrderItem,
  PedidoEstado,
} from '@/types';

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
  idempotencyKey?: string,
): Promise<Pedido> {
  // Backend envuelve la respuesta: { ok, message, data: Pedido }
  // The Idempotency-Key header is best-effort: servers that ignore unknown
  // headers are unaffected. The client-side in-flight record is the real
  // duplicate-order safety net, so this header is never relied upon.
  const response = idempotencyKey
    ? await api.post<ApiResponse<Pedido>>('/pedidos/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    : await api.post<ApiResponse<Pedido>>('/pedidos/', payload);
  const order = response.data?.data;
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

/**
 * Input for the mount-time reconciliation matcher. Grouped structurally (not
 * importing checkoutPersistence: services must not depend on sibling services)
 * so the persisted in-flight record can constrain the match.
 */
export interface OrderRecordMatchInput {
  readonly payload: CreateOrderPayload;
  readonly productNames: string[];
  readonly total: number;
}

/**
 * Mount-time reconciliation after an app kill: recovers a stale in-flight
 * record whose POST already committed server-side. Unlike findMatchingOrder,
 * this does NOT apply the 60s recency window — the persisted record itself
 * constrains the match (exact item names + quantities from the record payload
 * against the candidate order's detail items, plus total ±epsilon and
 * estado_actual === 'pendiente'), so an order created minutes or hours ago is
 * still matchable when the record exists.
 *
 * The match is bounded to the MOST RECENT pending order matching the total:
 * an older identical pending order from a previous attempt must never be
 * attributed to this interrupted checkout (it would show a wrong orderId and
 * leave the real new order unreconciled). A non-matching newest candidate
 * therefore returns null instead of falling back to older orders.
 */
export async function findOrderByRecord(
  input: OrderRecordMatchInput,
): Promise<Order | null> {
  const { payload, total } = input;
  // An empty payload never creates an order server-side.
  if (payload.items.length === 0) {
    return null;
  }

  const response = await api.get<{ results?: OrderListItem[] }>('/pedidos/');

  // The list order is not trusted: pick the newest pendiente candidate that
  // matches the total by created date, then verify only it against the record.
  const newestCandidate = (response.data.results ?? [])
    .filter(
      (candidate) =>
        candidate.estado_actual === 'pendiente' &&
        totalsMatch(candidate.total, total),
    )
    .sort((a, b) => orderDateMs(b) - orderDateMs(a))[0];

  if (newestCandidate === undefined) {
    return null;
  }

  const detail = await api.get<OrderDetail>(
    `/pedidos/${newestCandidate.id_pedido}/`,
  );
  if (itemsMatchRecord(detail.data.detalles, input)) {
    return toOrder(newestCandidate);
  }

  return null;
}

function itemsMatchRecord(
  detalles: OrderItem[],
  input: OrderRecordMatchInput,
): boolean {
  const { payload, productNames } = input;
  if (detalles.length !== payload.items.length) return false;
  if (detalles.length !== productNames.length) return false;

  // The backend creates detalles in payload order, which equals the cart
  // order, but compare as sorted multisets so ordering differences never
  // produce a false negative.
  const actual = detalles
    .map((d) => `${d.nombre_producto.trim()}|${d.cantidad}`)
    .sort();
  const expected = payload.items
    .map((item, i) => `${(productNames[i] ?? '').trim()}|${item.cantidad}`)
    .sort();
  return actual.every((key, i) => key === expected[i]);
}

function isRecentPendiente(candidate: OrderListItem): boolean {
  if (candidate.estado_actual !== 'pendiente') return false;
  const created = new Date(candidate.creado_en).getTime();
  return !Number.isNaN(created) && Date.now() - created <= RECONCILE_WINDOW_MS;
}

// Milliseconds since epoch for a candidate's creation date; unparseable dates
// sort as oldest so they never win a recency-bound match.
function orderDateMs(candidate: OrderListItem): number {
  const created = new Date(candidate.creado_en).getTime();
  return Number.isNaN(created) ? 0 : created;
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
