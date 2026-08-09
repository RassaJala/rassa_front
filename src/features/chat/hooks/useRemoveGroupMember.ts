import { conversationsKey, groupMembersKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';

export function useRemoveGroupMember(
  conversationId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (usuarioId: number) =>
      chatApi.removeGroupMember(conversationId, usuarioId),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: groupMembersKey(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
    },
  });
}
