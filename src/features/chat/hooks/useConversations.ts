import { useIsFocused } from '@react-navigation/native';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';
import type { Conversation, PaginatedResponse } from '@/types/chat';

const BASE_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;

export function useConversations(): UseQueryResult<
  PaginatedResponse<Conversation>
> {
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
    refetchInterval: (query) => {
      if (!isFocused) return false;
      const failureCount = query.state.errorUpdateCount;
      const backoff = Math.min(BASE_POLL_MS * 2 ** failureCount, MAX_POLL_MS);
      return backoff;
    },
    refetchIntervalInBackground: false,
    staleTime: BASE_POLL_MS,
  });
}
