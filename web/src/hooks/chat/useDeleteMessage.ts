import { messagesKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import type { Message, PaginatedResponse } from '@rassa/chat';

export function useDeleteMessage(
  conversationId: number,
): UseMutationResult<Message, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId) => chatApi.deleteMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({
        queryKey: messagesKey(conversationId),
      });

      const previousMessages = queryClient.getQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(messagesKey(conversationId));

      queryClient.setQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(messagesKey(conversationId), (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            results: page.results.map((msg) =>
              msg.id === messageId ? { ...msg, activo: false } : msg,
            ),
          })),
        };
      });

      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messagesKey(conversationId),
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: messagesKey(conversationId),
      });
    },
  });
}
