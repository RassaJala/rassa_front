import React from 'react';
import { Text, View } from 'react-native';

import type { GroupMember } from '@/types/chat';

interface GroupMemberItemProps {
  member: GroupMember;
}

export default function GroupMemberItem({
  member,
}: Readonly<GroupMemberItemProps>): React.JSX.Element {
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
          {member.rol}
        </Text>
      </View>
    </View>
  );
}
