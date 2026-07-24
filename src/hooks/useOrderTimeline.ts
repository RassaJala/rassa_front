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
      const { data } = await api.get(`/pedidos/${orderId}/historial`);
      if (Array.isArray(data)) return data;
      if (
        data &&
        typeof data === 'object' &&
        'data' in data &&
        Array.isArray(data.data)
      )
        return data.data;
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
