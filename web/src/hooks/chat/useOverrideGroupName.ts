import { conversationsKey, groupMembersKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';

export function useOverrideGroupName(
  conversationId: number,
): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nombreOverride: boolean) =>
      chatApi.overrideGroupName(conversationId, nombreOverride),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: groupMembersKey(conversationId),
      });
    },
  });
}
