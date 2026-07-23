import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { ApiResponse, OrderStatusHistory } from '@/types';

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
  } = useQuery<OrderStatusHistory[]>({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<OrderStatusHistory[]> | OrderStatusHistory[]
      >(`/pedidos/${orderId}/historial`);
      // Handle both wrapped { data: [...] } and flat [...] responses
      if (Array.isArray(data)) return data;
      return data.data;
    },
    enabled: orderId > 0,
    staleTime: 30_000,
    retry: false,
  });

  return { entries, isLoading, isError, error, refetch };
}
