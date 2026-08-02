import type { AxiosInstance } from 'axios';

// ── Shared constants ───────────────────────────────────────

export const ORDER_STATUS_READY = 'listo_para_retirar';

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
  readonly productos: PaymentProduct[];
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
  const res = await api.get<PaymentDetail[] | { results?: PaymentDetail[] }>(
    '/pagos/',
  );
  const body = res.data;
  return Array.isArray(body) ? body : (body.results ?? []);
}

export async function fetchPagoPorPedido(
  api: AxiosInstance,
  pedidoId: number,
): Promise<PaymentDetail | null> {
  const res = await api.get<PaymentDetail[] | { results?: PaymentDetail[] }>(
    `/pagos/?pedido=${pedidoId}`,
  );
  const body = res.data;
  const pagos = Array.isArray(body) ? body : (body.results ?? []);
  return pagos[0] ?? null;
}
