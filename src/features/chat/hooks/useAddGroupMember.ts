import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addGroupMember } from '@/services/chat';
import type { AddGroupMemberPayload, GroupMember } from '@/types/chat';

export function useAddGroupMember(
  conversationId: number,
): UseMutationResult<GroupMember, Error, AddGroupMemberPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => addGroupMember(conversationId, payload),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groupMembers', conversationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}
