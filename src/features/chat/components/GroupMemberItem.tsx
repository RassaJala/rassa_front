import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { GroupMember } from '@/types/chat';

interface GroupMemberItemProps {
  member: GroupMember;
  onRemove?: (usuarioId: number) => void;
}

export default function GroupMemberItem({
  member,
  onRemove,
}: Readonly<GroupMemberItemProps>): React.JSX.Element {
  const rolLabel = member.rol === 'admin' ? 'Jefe' : 'Miembro';
  return (
    <View className="flex-row items-center gap-3 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {member.nombre.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {member.nombre}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {rolLabel}
        </Text>
      </View>

      {onRemove ? (
        <Pressable
          onPress={() => onRemove(member.id_usuario)}
          className="rounded-lg bg-red-100 px-3 py-1.5 dark:bg-red-900"
          accessibilityRole="button"
          accessibilityLabel={`Remover a ${member.nombre}`}
        >
          <Text className="text-xs font-medium text-red-700 dark:text-red-200">
            Remover
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
