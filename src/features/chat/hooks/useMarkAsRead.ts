import { conversationsKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';

export function useMarkAsRead(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId) =>
      chatApi.markConversationAsRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
    },
  });
}
