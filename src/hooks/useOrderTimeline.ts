import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { OrderStatusHistory } from '@/types';

const STALE_TIME = 30_000;

// ponytail: inline helper instead of pulling isAxiosError into a constants file
function isNotFoundError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const err = error as { response?: { status?: number } };
  return err.response?.status === 404;
}

interface WrappedData {
  data: unknown;
}

function isWrappedData(value: unknown): value is WrappedData {
  return (
    value != null &&
    typeof value === 'object' &&
    'data' in value
  );
}

export function useOrderTimeline(orderId: number): {
  entries: OrderStatusHistory[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const {
    data: entries = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OrderStatusHistory[], Error>({
    queryKey: ['order-history', orderId] as const,
    queryFn: async () => {
      const res = await api.get<unknown>(`/pedidos/${orderId}/historial`);
      const body = res.data;
      // ponytail: backend usually returns array directly, fallback for wrapped response
      if (Array.isArray(body)) return body as OrderStatusHistory[];
      if (isWrappedData(body)) return body.data as OrderStatusHistory[];
      return [];
    },
    enabled: orderId > 0,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: unknown) => {
      if (isNotFoundError(error)) return false;
      return failureCount < 2;
    },
  });

  return { entries, isLoading, isError, error, refetch };
}
