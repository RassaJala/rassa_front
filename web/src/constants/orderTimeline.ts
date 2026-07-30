import type { OrderStatusHistory } from '../types';

export const DOT_SIZE = 12;
export const STALE_TIME = 30_000;

export function isNotFoundError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const err = error as { response?: { status?: number } };
  return err.response?.status === 404;
}

interface WrappedData {
  data: unknown;
}

export function isWrappedData(value: unknown): value is WrappedData {
  return value != null && typeof value === 'object' && 'data' in value;
}

export const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  } catch {
    console.warn('[orderTimeline] Invalid timestamp:', iso);
    return '—';
  }
}

export function buildDescription(entry: {
  readonly estado_anterior: string | null;
  readonly estado_nuevo: string;
}): string {
  if (entry.estado_anterior === null) {
    return 'Pedido creado';
  }
  const fromLabel =
    STATUS_LABELS[entry.estado_anterior] ?? entry.estado_anterior;
  const toLabel = STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo;
  return `${fromLabel} → ${toLabel}`;
}

export const STATUS_COLORS: Record<string, string> = {
  pendiente: '#f59e0b',
  confirmado: '#22c55e',
  en_preparacion: '#3b82f6',
  listo_para_retirar: '#3b82f6',
  entregado: '#22c55e',
  cancelado: '#DE393A',
};

export function getStatusColor(status: string, fallback: string): string {
  return STATUS_COLORS[status] ?? fallback;
}

// ponytail: single normalizer shared by mobile hook and web route
export function normalizeOrderHistoryResponse(
  body: unknown,
): OrderStatusHistory[] {
  if (Array.isArray(body)) return body as OrderStatusHistory[];
  if (body != null && typeof body === 'object' && 'data' in body) {
    if (Array.isArray(body.data)) return body.data as OrderStatusHistory[];
    return [];
  }
  return [];
}
