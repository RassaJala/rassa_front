import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getMessages } from '@/services/chat';
import type { Message, PaginatedResponse } from '@/types/chat';

export function useChatMessages(
  conversationId: number,
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<Message>>> {
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
    refetchInterval: 5_000,
    staleTime: 0,
  });
}
