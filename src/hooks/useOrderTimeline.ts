import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import { getMockOrderHistory } from '@/services/mock/orderHistory';
import type { ApiResponse, OrderStatusHistory } from '@/types';

declare const __DEV__: boolean | undefined;

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
      // ponytail: use mock data in dev so the timeline is visible without backend
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        await new Promise((r) => setTimeout(r, 600)); // simulate network delay
        const mock = getMockOrderHistory(orderId);
        if (mock.length === 0) {
          throw new Error('El pedido no tiene historial');
        }
        return mock;
      }

      const { data } = await api.get<ApiResponse<OrderStatusHistory[]>>(
        `/orders/${orderId}/history/`,
      );
      return data.data;
    },
    enabled: orderId > 0,
    staleTime: 30_000,
    retry: false,
  });

  return { entries, isLoading, isError, error, refetch };
}
