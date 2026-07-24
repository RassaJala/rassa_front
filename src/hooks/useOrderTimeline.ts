import { useQuery } from '@tanstack/react-query';

import { createOrderHistoryQueryOptions } from '@/constants/orderTimeline';
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
  } = useQuery<OrderStatusHistory[]>(
    createOrderHistoryQueryOptions<OrderStatusHistory>(
      orderId,
      (url) => api.get(url),
    ),
  );

  return { entries, isLoading, isError, error, refetch };
}
