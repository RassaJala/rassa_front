import { messagesKey } from '@rassa/chat';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import type { Message, PaginatedResponse } from '@rassa/chat';

const POLL_MS = 5_000;

export function useChatMessages(
  conversationId: number,
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<Message>>> {
  return useInfiniteQuery({
    queryKey: messagesKey(conversationId),
    queryFn: ({ pageParam = 1 }) =>
      chatApi.getMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          const url = new URL(lastPage.next);
          const page = Number(url.searchParams.get('page'));
          return Number.isNaN(page) ? undefined : page;
        } catch {
          return undefined;
        }
      }
      // eslint-disable-next-line unicorn/no-useless-undefined -- required by TanStack Query to signal no next page
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: (query) => {
      if (query.state.isInvalidated) return false;
      return POLL_MS;
    },
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    select: (data) => {
      const seen = new Set<string>();
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          results: page.results.filter((msg) => {
            const key = `${msg.conversacion}-${msg.remitente}-${msg.contenido}-${msg.creado_en}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        })),
      };
    },
  });
}
