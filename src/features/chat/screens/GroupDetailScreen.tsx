import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import AddMemberModal from '@/features/chat/components/AddMemberModal';
import GroupMemberItem from '@/features/chat/components/GroupMemberItem';
import RenameGroupModal from '@/features/chat/components/RenameGroupModal';
import { useAddGroupMember } from '@/features/chat/hooks/useAddGroupMember';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useGroupMembers } from '@/features/chat/hooks/useGroupMembers';
import { useRenameGroup } from '@/features/chat/hooks/useRenameGroup';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList } from '@/types/chat';

export default function GroupDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ChatStackParamList, 'GroupDetail'>>();
  const { conversationId, isFamily } = route.params;
  const { user } = useAuth();

  const { data: members, isLoading, error } = useGroupMembers(conversationId);
  const renameMutation = useRenameGroup(conversationId);
  const addMemberMutation = useAddGroupMember(conversationId);
  const createChatMutation = useCreatePrivateConversation();

  const [renameVisible, setRenameVisible] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  const canManage = user?.role !== 'buyer' && !isFamily;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-rassa-bg dark:bg-rassa-bg-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-rassa-bg p-4 dark:bg-rassa-bg-dark">
        <Text className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark">
          Error al cargar miembros del grupo.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-rassa-bg dark:bg-rassa-bg-dark">
      {canManage ? (
        <View className="flex-row gap-3 border-b border-rassa-border p-4 dark:border-rassa-border-dark">
          <Text
            onPress={() => setRenameVisible(true)}
            className="rounded-lg bg-rassa-border px-4 py-2 text-sm font-medium text-rassa-fg dark:bg-rassa-border-dark dark:text-rassa-fg-dark"
          >
            Renombrar
          </Text>
          <Text
            onPress={() => setAddMemberVisible(true)}
            className="rounded-lg bg-rassa-brand px-4 py-2 text-sm font-medium text-white dark:bg-rassa-brand-dark"
          >
            Agregar integrante
          </Text>
        </View>
      ) : null}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <GroupMemberItem
            member={item}
            chatDisabled={createChatMutation.isPending}
            {...(item.idUsuario === user?.id
              ? {}
              : {
                  onChat: (member) =>
                    createChatMutation.mutate({ fk_usuario: member.idUsuario }),
                })}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-rassa-border dark:bg-rassa-border-dark" />
        )}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-4">
            <Text className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark">
              No hay miembros en este grupo
            </Text>
          </View>
        }
      />

      <RenameGroupModal
        visible={renameVisible}
        currentName={route.params.title}
        onDismiss={() => setRenameVisible(false)}
        onSave={(name) => {
          renameMutation.mutate(
            { nombre: name },
            {
              onSuccess: () => setRenameVisible(false),
            },
          );
        }}
        saving={renameMutation.isPending}
      />

      <AddMemberModal
        visible={addMemberVisible}
        onDismiss={() => setAddMemberVisible(false)}
        onAdd={(userId) => {
          addMemberMutation.mutate(
            { fk_usuario: userId },
            {
              onSuccess: () => setAddMemberVisible(false),
            },
          );
        }}
        adding={addMemberMutation.isPending}
      />
    </View>
  );
}
