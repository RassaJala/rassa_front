import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { ApiResponse, OrderStatusHistory } from '@/types';

export function useOrderTimeline(
  orderId: number,
): {
  entries: OrderStatusHistory[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const { data: entries = [], isLoading, isError, error, refetch } = useQuery<
    OrderStatusHistory[]
  >({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OrderStatusHistory[]>>(
        `/orders/${orderId}/history/`,
      );
      return data.data;
    },
    enabled: orderId > 0,
    staleTime: 30_000,
  });

  return { entries, isLoading, isError, error, refetch };
}
