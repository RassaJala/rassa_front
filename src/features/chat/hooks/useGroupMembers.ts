import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { chatApi } from '@/services/chat';
import type { GroupMember } from '@/types/chat';

export function useGroupMembers(
  conversationId: number,
): UseQueryResult<GroupMember[]> {
  return useQuery({
    queryKey: ['groupMembers', conversationId],
    queryFn: () => chatApi.getGroupMembers(conversationId),
    staleTime: 30_000,
  });
}
