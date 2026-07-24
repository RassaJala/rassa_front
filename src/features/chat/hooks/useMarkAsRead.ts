import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';
import type { Message } from '@/types/chat';

export function useMarkAsRead(): UseMutationResult<Message, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId) => chatApi.markMessageAsRead(messageId),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}
