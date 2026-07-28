// Constants and helpers for the order status timeline (AdminOrderDetail).
// ponytail: minimal implementations matching the shape AdminOrderDetail.tsx consumes.

import type { OrderStatusHistory } from '~/types';

/** React Query stale time for the order history query (ms). */
export const STALE_TIME = 30_000;

/** Diameter (px) of the timeline dot. */
export const DOT_SIZE = 12;

/** Spanish labels keyed by backend estado_nuevo value. */
export const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  activo: 'Activo',
};

/** Color per estado_nuevo. Falls back to `fallback` (usually the theme border). */
export function getStatusColor(estado: string, fallback: string): string {
  const map: Record<string, string> = {
    pendiente: '#f59e0b',
    confirmado: '#3b82f6',
    en_preparacion: '#8b5cf6',
    listo_para_retirar: '#10b981',
    entregado: '#22c55e',
    cancelado: '#ef4444',
    activo: '#6366f1',
  };
  return map[estado] ?? fallback;
}

/** Human-readable description of a status transition. */
export function buildDescription(entry: OrderStatusHistory): string {
  const prev = entry.estado_anterior;
  const next = entry.estado_nuevo;
  if (prev === null) return `Pedido creado en estado "${next}".`;
  return `Cambió de "${prev}" a "${next}".`;
}

/** Format an ISO datetime string as a localized timestamp. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** True if the axios error is a Django 404 (pedido no encontrado). */
export function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { response?: { status?: number }; message?: string };
  return e.response?.status === 404;
}

/** Type guard for a wrapped Django response: `{ data: T[] }`. */
export function isWrappedData(
  body: unknown,
): body is { data: OrderStatusHistory[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray((body as { data: unknown }).data)
  );
}
