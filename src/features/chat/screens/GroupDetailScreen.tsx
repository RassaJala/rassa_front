import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Switch,
  Text,
  View,
} from 'react-native';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import AddMemberModal from '@/features/chat/components/AddMemberModal';
import GroupMemberItem from '@/features/chat/components/GroupMemberItem';
import RenameGroupModal from '@/features/chat/components/RenameGroupModal';
import { useAddGroupMember } from '@/features/chat/hooks/useAddGroupMember';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useGroupMembers } from '@/features/chat/hooks/useGroupMembers';
import { useOverrideGroupName } from '@/features/chat/hooks/useOverrideGroupName';
import { useRemoveGroupMember } from '@/features/chat/hooks/useRemoveGroupMember';
import { useRenameGroup } from '@/features/chat/hooks/useRenameGroup';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList } from '@/types/chat';

export default function GroupDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ChatStackParamList, 'GroupDetail'>>();
  const { conversationId } = route.params;
  const { user } = useAuth();

  const { data: conversations } = useConversations();
  const currentConversation = conversations?.results?.find(
    (conv) => conv.id === conversationId,
  );
  const isFamily = currentConversation?.es_familia ?? false;
  const nombreOverride = currentConversation?.nombre_override ?? false;

  const { data: members, isLoading, error } = useGroupMembers(conversationId);
  const isChatAdmin =
    members?.find((m) => m.id_usuario === user?.id)?.rol === 'admin';
  const renameMutation = useRenameGroup(conversationId);
  const addMemberMutation = useAddGroupMember(conversationId);
  const removeMemberMutation = useRemoveGroupMember(conversationId);
  const overrideMutation = useOverrideGroupName(conversationId);

  const [renameVisible, setRenameVisible] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  const canEdit = isChatAdmin && (!isFamily || nombreOverride === true);
  const canRemove = isChatAdmin && !isFamily;
  const canOverride = isChatAdmin && isFamily === true;

  const handleRemove = (usuarioId: number) => {
    Alert.alert(
      'Remover integrante',
      '¿Seguro que deseas remover a este integrante del grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate(usuarioId),
        },
      ],
    );
  };

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
      {canEdit ? (
        <View className="flex-row gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <Text
            onPress={() => setRenameVisible(true)}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            Renombrar
          </Text>
          {isFamily ? null : (
            <Text
              onPress={() => setAddMemberVisible(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
            >
              Agregar integrante
            </Text>
          )}
        </View>
      ) : null}

      {canOverride ? (
        <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <Text className="text-sm text-gray-700 dark:text-gray-200">
            Nombre desacoplado de la familia
          </Text>
          <Switch
            value={nombreOverride === true}
            onValueChange={(v) => overrideMutation.mutate(v)}
          />
        </View>
      ) : null}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          canRemove ? (
            <GroupMemberItem member={item} onRemove={handleRemove} />
          ) : (
            <GroupMemberItem member={item} />
          )
        }
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
