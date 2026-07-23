import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { editMessage } from '@/services/chat';
import type { Message, PaginatedResponse } from '@/types/chat';

type EditMessageVariables = { messageId: number; contenido: string };

export function useEditMessage(
  conversationId: number,
): UseMutationResult<Message, Error, EditMessageVariables> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, contenido }) => editMessage(messageId, contenido),
    onMutate: async ({ messageId, contenido }) => {
      await queryClient.cancelQueries({
        queryKey: ['messages', conversationId],
      });

      const previousMessages = queryClient.getQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(['messages', conversationId]);

      queryClient.setQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(['messages', conversationId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            results: page.results.map((msg) =>
              msg.id === messageId ? { ...msg, contenido, editado: true } : msg,
            ),
          })),
        };
      });

      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['messages', conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['messages', conversationId],
      });
    },
  });
}
