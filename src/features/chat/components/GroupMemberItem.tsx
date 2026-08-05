import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { GroupMember } from '@/types/chat';

interface GroupMemberItemProps {
  member: GroupMember;
  onRemove?: (usuarioId: number) => void;
  onChat?: (member: GroupMember) => void;
  chatDisabled?: boolean;
}

export default function GroupMemberItem({
  member,
  onRemove,
  onChat,
  chatDisabled,
}: Readonly<GroupMemberItemProps>): React.JSX.Element {
  const rolLabel = member.rol === 'admin' ? 'Jefe' : 'Miembro';
  return (
    <View className="flex-row items-center gap-3 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-rassa-border dark:bg-rassa-border-dark">
        <Text className="text-sm font-medium text-rassa-muted dark:text-rassa-muted-dark">
          {member.nombre.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-rassa-fg dark:text-rassa-fg-dark">
          {member.nombre}
        </Text>
        <Text className="text-xs text-rassa-muted dark:text-rassa-muted-dark">
          {rolLabel}
        </Text>
      </View>

      {onRemove ? (
        <Pressable
          onPress={() => onRemove(member.idUsuario)}
          className="rounded-lg bg-red-100 px-3 py-1.5 dark:bg-red-900"
          accessibilityRole="button"
          accessibilityLabel={`Remover a ${member.nombre}`}
        >
          <Text className="text-xs font-medium text-red-700 dark:text-red-200">
            Remover
          </Text>
        </Pressable>
      ) : null}

      {onChat ? (
        <Text
          onPress={() => onChat(member)}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            chatDisabled
              ? 'bg-rassa-border text-rassa-muted dark:bg-rassa-border-dark dark:text-rassa-muted-dark'
              : 'bg-rassa-brand text-white dark:bg-rassa-brand-dark'
          }`}
        >
          Chatear
        </Text>
      ) : null}
    </View>
  );
}
