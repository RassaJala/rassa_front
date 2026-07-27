import { conversationsKey } from '@rassa/chat';
import { useNavigate } from 'react-router-dom';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '~/services/chat';
import { useAuth } from '~/hooks/useAuth';
import type { Conversation } from '@rassa/chat';

export function useCreatePrivateConversation(): UseMutationResult<
  Conversation,
  Error,
  { fk_usuario: number }
> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload) => chatApi.createPrivateConversation(payload),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: conversationsKey(),
      });
      if (user?.rol) navigate(`/${user.rol}/chat/${conversation.id}`);
    },
  });
}
