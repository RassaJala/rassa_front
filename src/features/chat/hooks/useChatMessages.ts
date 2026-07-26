import { useIsFocused } from '@react-navigation/native';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getMessages } from '@/services/chat';
import type { Message, PaginatedResponse } from '@/types/chat';

const BASE_POLL_MS = 5_000;
const MAX_POLL_MS = 60_000;

export function useChatMessages(
  conversationId: number,
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<Message>>> {
  const isFocused = useIsFocused();

  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 1 }) => getMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        return Number(url.searchParams.get('page'));
      }

      // eslint-disable-next-line unicorn/no-useless-undefined -- required by TanStack Query to signal no next page
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: (query) => {
      if (!isFocused) return false;
      const failureCount = query.state.errorUpdateCount;
      return Math.min(BASE_POLL_MS * 2 ** failureCount, MAX_POLL_MS);
    },
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  });
}
