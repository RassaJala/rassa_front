import { conversationsKey, messagesKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import { useAuth } from '~/hooks/useAuth';
import type {
  Message,
  PaginatedResponse,
  SendMessageWithMediaPayload,
} from '@rassa/chat';

export function useSendMessageWithMedia(
  conversationId: number,
): UseMutationResult<Message, Error, SendMessageWithMediaPayload> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload) => chatApi.sendMessageWithMedia(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: messagesKey(conversationId),
      });

      const previousMessages = queryClient.getQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(messagesKey(conversationId));

      const optimisticMessage: Message = {
        id: Date.now(),
        conversacion: payload.conversacion,
        remitente: user?.id ?? 0,
        remitente_nombre: user?.nombre ?? 'Tú',
        contenido: payload.contenido ?? '',
        creado_en: new Date().toISOString(),
        leido: false,
        adjuntos: [
          {
            id: Date.now(),
            mensaje: 0,
            archivo: URL.createObjectURL(payload.documento as File),
            tipo: payload.tipo_documento,
            nombre: (payload.documento as File).name,
            tamaño: (payload.documento as File).size,
          },
        ],
      };

      queryClient.setQueryData<{
        pages: PaginatedResponse<Message>[];
        pageParams: number[];
      }>(messagesKey(conversationId), (old) => {
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

      return { previousMessages, optimisticId: optimisticMessage.id };
    },
    onSuccess: (data, _variables, context) => {
      if (context?.optimisticId == null) return;
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
              msg.id === context.optimisticId ? data : msg,
            ),
          })),
        };
      });
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
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
    },
  });
}
