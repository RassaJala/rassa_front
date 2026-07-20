import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPrivateConversation } from '@/services/chat';
import type { ChatStackParamList, Conversation } from '@/types/chat';

export function useCreatePrivateConversation(): UseMutationResult<
  Conversation,
  Error,
  { fk_usuario: number }
> {
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChatStackParamList>>();

  return useMutation({
    mutationFn: createPrivateConversation,
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.participante_nombre,
      });
    },
  });
}
