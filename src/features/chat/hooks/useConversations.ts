import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { getConversations } from '@/services/chat';
import type { Conversation, PaginatedResponse } from '@/types/chat';

export function useConversations(): UseQueryResult<
  PaginatedResponse<Conversation>
> {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 10_000,
    staleTime: 0,
  });
}
