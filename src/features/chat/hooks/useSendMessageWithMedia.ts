import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendMessageWithMedia } from '@/services/chat';
import { useAuth } from '@/store/AuthContext';
import type {
  Message,
  PaginatedResponse,
  SendMessageWithMediaPayload,
} from '@/types/chat';

export function useSendMessageWithMedia(
  conversationId: number,
): UseMutationResult<Message, Error, SendMessageWithMediaPayload> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: sendMessageWithMedia,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: ['messages', conversationId],
      });

      const previousMessages = queryClient.getQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(['messages', conversationId]);

      const optimisticMessage: Message = {
        id: Date.now(),
        conversacion: payload.conversacion,
        remitente: user?.id ?? 0,
        remitente_nombre: user?.nombre ?? 'Tú',
        contenido: payload.contenido ?? '',
        creado_en: new Date().toISOString(),
        leido: false,
      };

      queryClient.setQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(['messages', conversationId], (old) => {
        if (!old) return old;
        const firstPage = old.pages.at(0);
        if (!firstPage) return old;
        const updatedFirstPage = {
          ...firstPage,
          results: [optimisticMessage, ...firstPage.results],
        };
        return {
          ...old,
          pages: [updatedFirstPage, ...old.pages.slice(1)],
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
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}
