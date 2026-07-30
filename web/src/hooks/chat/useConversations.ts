import { conversationsKey } from '@rassa/chat';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import type { Conversation, PaginatedResponse } from '@rassa/chat';

const BASE_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;

export function useConversations(): UseQueryResult<
  PaginatedResponse<Conversation>
> {
  return useQuery({
    queryKey: conversationsKey(),
    queryFn: () => chatApi.getConversations(),
    refetchInterval: (query) => {
      const failureCount = query.state.failureCount;
      return Math.min(BASE_POLL_MS * 2 ** failureCount, MAX_POLL_MS);
    },
    refetchIntervalInBackground: false,
    staleTime: BASE_POLL_MS,
  });
}
