import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createGroup } from '@/services/chat';
import type {
  ChatStackParamList,
  Conversation,
  CreateGroupPayload,
} from '@/types/chat';

export function useCreateGroup(): UseMutationResult<
  Conversation,
  Error,
  CreateGroupPayload
> {
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChatStackParamList>>();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.nombre,
      });
    },
  });
}
