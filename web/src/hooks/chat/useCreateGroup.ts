import { conversationsKey } from '@rassa/chat';
import { useNavigate } from 'react-router-dom';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import { useAuth } from '~/hooks/useAuth';
import type { Conversation, CreateGroupPayload } from '@rassa/chat';

export function useCreateGroup(): UseMutationResult<
  Conversation,
  Error,
  CreateGroupPayload
> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload) => chatApi.createGroup(payload),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
      if (user?.rol) navigate(`/${user.rol}/chat/${conversation.id}`);
    },
  });
}
