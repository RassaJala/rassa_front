import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import AddMemberModal from '@/features/chat/components/AddMemberModal';
import GroupMemberItem from '@/features/chat/components/GroupMemberItem';
import RenameGroupModal from '@/features/chat/components/RenameGroupModal';
import { useAddGroupMember } from '@/features/chat/hooks/useAddGroupMember';
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

  const [renameVisible, setRenameVisible] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  const canManage = user?.role !== 'buyer' && !isFamily;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          Error al cargar miembros del grupo.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {canManage ? (
        <View className="flex-row gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <Text
            onPress={() => setRenameVisible(true)}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            Renombrar
          </Text>
          <Text
            onPress={() => setAddMemberVisible(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
          >
            Agregar integrante
          </Text>
        </View>
      ) : null}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <GroupMemberItem member={item} />}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-gray-200 dark:bg-gray-800" />
        )}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-4">
            <Text className="text-center text-base text-gray-500 dark:text-gray-400">
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
