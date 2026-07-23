import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { renameGroup } from '@/services/chat';
import type { Conversation, RenameGroupPayload } from '@/types/chat';

export function useRenameGroup(
  conversationId: number,
): UseMutationResult<Conversation, Error, RenameGroupPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => renameGroup(conversationId, payload),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['groupMembers', conversationId],
      });
    },
  });
}
