import axios from 'axios';
import api from '~/services/api';
import type { ApiResponse } from '~/types';
import { extractApiError, isSafeDetail } from '~/utils/apiErrors';
import { logError } from '~/utils/logger';
import type { Pedido } from './orderTypes';

export interface CreateOrderItem {
  id_producto_semanal: number;
  cantidad: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
}

export const AMBIGUOUS_MSG =
  'No pudimos confirmar si tu pedido se creó. Revisá tus pedidos antes de intentar de nuevo.';

export const MALFORMED_RESPONSE_MSG =
  'El servidor respondió con un formato inesperado. Intenta de nuevo.';

export const ORDER_ERROR_DEFAULT = 'Error del servidor. Intenta de nuevo.';

// S-11: stable log context for the ambiguous-order case — an operator must be
// able to grep logs for this marker and investigate whether the order was
// actually created server-side.
export const AMBIGUOUS_LOG_MARKER = 'checkout/ambiguous-order';

// S-11: structured observability for the ambiguous case. The persisted
// ambiguous marker (rassa-checkout-ambiguous) is passed in `extra` so the log
// line can be correlated with the stored record. Best-effort: the persisted
// marker remains the durable signal even where logs are not collected.
// W-6: the console.warn fires in EVERY environment — the dev-only
// console.error (with stack) is compiled out of production builds, so without
// this warn an operator would have no signal to grep. Residual debt: there is
// no Sentry/beacon transport; logs are the only channel.
export function reportAmbiguousOrder(
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    AMBIGUOUS_LOG_MARKER,
    message,
    extra ?? {},
    new Date().toISOString(),
  );
  logError(AMBIGUOUS_LOG_MARKER, error, extra);
}

// W-3: a 2xx without a valid { data: Pedido } envelope IS AMBIGUOUS — the
// server answered 2xx, so the order may have been created even though the
// response is unusable. The client cannot confirm the outcome, so the marker
// must be persisted and the idempotency key kept (see isAmbiguousOrderError).
export class MalformedOrderResponseError extends Error {
  constructor() {
    super(MALFORMED_RESPONSE_MSG);
    this.name = 'MalformedOrderResponseError';
  }
}

export function isPedidoResponse(value: unknown): value is Pedido {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id_pedido?: unknown }).id_pedido === 'number'
  );
}

export interface OrderLineCandidate {
  id_producto_semanal: number;
  cantidad: number;
  stock: number;
}

export interface ClampResult {
  items: CreateOrderItem[];
  skipped: number[];
}

// W-2: defense in depth — a tampered persisted cart must never send invalid
// quantities to the server. Only integer quantities within [1, stock] are
// kept; everything else is reported as skipped (the server 400 stays the
// authority, but we never get there with garbage).
// S-9f: product ids are deduped — the first valid line per product wins and
// later duplicates are reported as skipped so the payload never carries two
// lines for the same id_producto_semanal.
export function clampOrderItems(candidates: OrderLineCandidate[]): ClampResult {
  const items: CreateOrderItem[] = [];
  const skipped: number[] = [];
  const seen = new Set<number>();
  for (const line of candidates) {
    if (
      Number.isInteger(line.cantidad) &&
      line.cantidad >= 1 &&
      line.cantidad <= line.stock &&
      !seen.has(line.id_producto_semanal)
    ) {
      items.push({
        id_producto_semanal: line.id_producto_semanal,
        cantidad: line.cantidad,
      });
      seen.add(line.id_producto_semanal);
    } else {
      skipped.push(line.id_producto_semanal);
    }
  }
  return { items, skipped };
}

export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey?: string,
): Promise<Pedido> {
  // axios-retry reintenta errores de red en POST no idempotentes — se desactiva
  // por request para no duplicar pedidos; los interceptores de `api` se mantienen.
  // W-4: the Idempotency-Key header is best-effort — a backend that ignores
  // unknown headers is unaffected; the persisted ambiguous marker is the real
  // duplicate-order safety net, so this header is never relied upon.
  const config = idempotencyKey
    ? {
        'axios-retry': { retries: 0 },
        headers: { 'Idempotency-Key': idempotencyKey },
      }
    : { 'axios-retry': { retries: 0 } };
  const { data } = await api.post<ApiResponse<Pedido>>(
    '/pedidos/',
    payload,
    config,
  );
  const order = data?.data; // envelope { data: Pedido } — POST va envuelto, GET va crudo
  if (!isPedidoResponse(order)) {
    throw new MalformedOrderResponseError();
  }
  return order;
}

// Reads error.cause without requiring lib es2022 (web tsconfig.app.json lib
// is ES2020; `Error.cause` is only typed from ES2022 onward).
function unwrapCause(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const cause = (error as { cause?: unknown }).cause;
  return cause !== undefined ? cause : error;
}

// JD-001: DRF non-field errors llegan como array de strings:
// ["Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5."]
export function extractOrderError(error: unknown): string {
  const candidate = unwrapCause(error);
  const data = (candidate as { response?: { data?: unknown } } | null)?.response
    ?.data;

  if (Array.isArray(data)) {
    const first = data[0];
    if (
      first !== undefined &&
      String(first).trim() !== '' &&
      isSafeDetail(String(first))
    ) {
      return String(first);
    }
    return ORDER_ERROR_DEFAULT;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string' && isSafeDetail(record.detail)) {
      return record.detail;
    }
    // W-1: `message` must pass the same sanitizer as `detail` — a 5xx HTML /
    // traceback body in `message` must never render raw in the toast.
    if (typeof record.message === 'string') {
      return isSafeDetail(record.message)
        ? record.message
        : ORDER_ERROR_DEFAULT;
    }
  }

  return extractApiError(error, ['detail', 'message'], ORDER_ERROR_DEFAULT);
}

// JD-001-B: solo fallas reales de transporte axios (red/timeout, sin response)
// son ambiguas; un Error pelado (ej. cola 401 'Sesión expirada') nunca llegó
// al servidor y no debe clasificarse como "pudo haberse creado".
export function isAmbiguousOrderError(error: unknown): boolean {
  const candidate = unwrapCause(error);
  // W-3 (follow-up): a malformed 2xx envelope is ambiguous — the server
  // answered 2xx, so the order may exist even though the body is unusable.
  if (candidate instanceof MalformedOrderResponseError) {
    return true;
  }
  return (
    axios.isAxiosError(candidate) &&
    candidate.response === undefined &&
    // S-12: cancelaciones nunca llegaron al servidor — no son ambiguas.
    candidate.code !== 'ERR_CANCELED'
  );
}
