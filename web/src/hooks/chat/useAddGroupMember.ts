import { conversationsKey, groupMembersKey } from '@rassa/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import type { AddGroupMemberPayload, GroupMember } from '@rassa/chat';

export function useAddGroupMember(
  conversationId: number,
): UseMutationResult<GroupMember, Error, AddGroupMemberPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => chatApi.addGroupMember(conversationId, payload),
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
