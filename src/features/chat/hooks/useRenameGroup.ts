import { conversationsKey, groupMembersKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';
import type { Conversation, RenameGroupPayload } from '@/types/chat';

export function useRenameGroup(
  conversationId: number,
): UseMutationResult<Conversation, Error, RenameGroupPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => chatApi.renameGroup(conversationId, payload),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: groupMembersKey(conversationId),
      });
    },
  });
}
