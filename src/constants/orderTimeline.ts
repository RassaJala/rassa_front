import { isAxiosError } from 'axios';
import type { ApiResponse } from '@/types';

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

export function createOrderHistoryQueryOptions<T>(
  orderId: number,
  fetcher: (url: string) => Promise<{ data: ApiResponse<T[]> | T[] }>,
  enabled?: boolean,
) {
  return {
    queryKey: ['order-history', orderId] as const,
    queryFn: async (): Promise<T[]> => {
      const { data } = await fetcher(`/pedidos/${orderId}/historial`);
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray((data as ApiResponse<T[]>).data)) return (data as ApiResponse<T[]>).data;
      return [];
    },
    enabled: enabled ?? orderId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: Error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 2;
    },
  };
}

export function buildDescription(entry: {
  readonly estado_anterior: string | null;
  readonly estado_nuevo: string;
}): string {
  if (entry.estado_anterior === null) {
    return 'Pedido creado';
  }
  const fromLabel = STATUS_LABELS[entry.estado_anterior] ?? entry.estado_anterior;
  const toLabel = STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo;
  return `${fromLabel} → ${toLabel}`;
}

export function getStatusColor(status: string, fallback: string): string {
  switch (status) {
    case 'pendiente':
      return '#f59e0b';
    case 'confirmado':
      return '#22c55e';
    case 'en_preparacion':
    case 'listo_para_retirar':
      return '#3b82f6';
    case 'entregado':
      return '#22c55e';
    case 'cancelado':
      return '#DE393A';
    default:
      return fallback;
  }
}
