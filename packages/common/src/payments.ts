import type { AxiosInstance } from 'axios';

// ── Shared constants ───────────────────────────────────────

export const ORDER_STATUS_READY = 'listo_para_retirar';

/** Query key raíz para la lista de recibos del cliente. */
export const PAGOS_CLIENTE_QUERY_KEY = 'pagos-cliente';

// ── Ownership guard ────────────────────────────────────────
// Defensa en profundidad contra IDOR: aunque el backend ya filtra los pagos
// por propietario, nunca renderizamos un recibo ajeno del lado del cliente.
export function esPropietarioPago(
  pago: { readonly cliente_id: number | null } | null | undefined,
  userId: number | null | undefined,
): boolean {
  return pago != null && pago.cliente_id != null && pago.cliente_id === userId;
}

/** Valida que un id de pago sea un entero positivo. */
export function esPagoIdValido(paymentId: number | undefined | null): boolean {
  return (
    typeof paymentId === 'number' &&
    Number.isInteger(paymentId) &&
    paymentId > 0
  );
}

// ── Format helpers ────────────────────────────────────────

/** Importe de una partida de producto (cantidad × precio), con defaults seguros. */
export function calcularImporte(partida: {
  readonly cantidad?: number | null;
  readonly precio?: number | string | null;
}): number {
  return (partida.cantidad ?? 0) * Number(partida.precio ?? 0);
}

/** Subtotal de una lista de partidas de producto (cantidad × precio). */
export function calcularSubtotal(
  partidas: readonly {
    readonly cantidad?: number | null;
    readonly precio?: number | string | null;
  }[],
): number {
  return partidas.reduce((acc, partida) => acc + calcularImporte(partida), 0);
}

/** Formatea un monto como precio con `$` y dos decimales. */
export function formatearMonto(
  valor: number | string | null | undefined,
): string {
  if (valor == null) return '—';
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

// ── Payment types ─────────────────────────────────────────

export interface TipoPago {
  readonly id_tipo_pago: number;
  readonly nombre: string;
}

export function esEfectivo(tipo: { readonly nombre: string }): boolean {
  return tipo.nombre === 'Efectivo';
}

export interface PaymentProduct {
  readonly nombre: string;
  readonly precio: string;
  readonly cantidad: number;
}

export interface PaymentDetail {
  readonly id_pago: number;
  readonly folio: string;
  readonly pedido: number | null;
  readonly tipo_pago: number;
  readonly tipo_pago_nombre: string;
  readonly cliente_nombre: string | null;
  readonly cliente_id: number | null;
  readonly monto: string;
  readonly referencia: string;
  readonly total_pedido: string | null;
  readonly productos?: PaymentProduct[] | null;
  readonly fecha_pago: string;
}

export interface CreatePagoPayload {
  readonly pedido: number;
  readonly tipo_pago: number;
  readonly monto: string;
  readonly referencia?: string;
}

// ── Service ───────────────────────────────────────────────
// Shared by the mobile app (src/) and the web app (web/). Each platform has
// its own axios instance (src/services/api.ts vs web/src/services/api.ts)
// with different baseURL resolution, interceptors and retry config, and
// neither can be imported from this shared package, so callers pass their own
// api instance as the first argument.
export async function fetchTiposPago(api: AxiosInstance): Promise<TipoPago[]> {
  const res = await api.get<TipoPago[]>('/tipos-pago/');
  return res.data;
}

// Per-order idempotency key so a retried POST can never charge the buyer twice:
// the backend should reject a repeat POST for the same (pedido, key) pair.
export function createIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
  ) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function createPago(
  api: AxiosInstance,
  payload: CreatePagoPayload,
  idempotencyKey?: string,
): Promise<PaymentDetail> {
  const res = idempotencyKey
    ? await api.post<PaymentDetail>('/pagos/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    : await api.post<PaymentDetail>('/pagos/', payload);
  return res.data;
}

export async function fetchPago(
  api: AxiosInstance,
  id: number,
): Promise<PaymentDetail> {
  const res = await api.get<PaymentDetail>(`/pagos/${id}/`);
  return res.data;
}

export async function fetchPagos(api: AxiosInstance): Promise<PaymentDetail[]> {
  const res = await api.get<
    PaymentDetail[] | { results?: PaymentDetail[] } | null
  >('/pagos/');
  const body = res.data;
  // Fallo EXPLÍCITO en vez de degradación silenciosa: una respuesta inválida
  // no se debe interpretar como "no hay pagos" (enmascararía errores del API).
  if (body == null) {
    throw new Error('La respuesta del servidor es null al listar pagos');
  }
  const pagos = Array.isArray(body) ? body : body.results;
  if (!Array.isArray(pagos)) {
    throw new Error("El campo 'results' no es una lista al listar pagos");
  }
  return pagos;
}

export async function fetchPagoPorPedido(
  api: AxiosInstance,
  pedidoId: number,
): Promise<PaymentDetail | null> {
  // ponytail: este lookup individual mantiene null para respuestas inválidas a
  // propósito (null es legítimo: "este pedido aún no tiene pago"). Solo
  // fetchPagos (listado) lanza ante respuestas inválidas.
  const res = await api.get<
    PaymentDetail[] | { results?: PaymentDetail[] } | null
  >(`/pagos/?pedido=${pedidoId}`);
  const body = res.data;
  if (body == null) return null;
  const pagos = Array.isArray(body) ? body : body.results;
  if (!Array.isArray(pagos)) return null;
  return pagos[0] ?? null;
}
