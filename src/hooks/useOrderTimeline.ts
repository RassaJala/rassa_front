import { useQuery } from '@tanstack/react-query';

import { isWrappedData, STALE_TIME } from '@/constants/orderTimeline';
import api from '@/services/api';
import type { OrderStatusHistory } from '@/types';

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
    // ponytail: axios-retry handles retries globally, no amplification needed
    retry: false,
  });

  return { entries, isLoading, isError, error, refetch };
}
