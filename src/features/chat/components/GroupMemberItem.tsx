import React from 'react';
import { Text, View } from 'react-native';

import type { GroupMember } from '@/types/chat';

interface GroupMemberItemProps {
  member: GroupMember;
  onChat?: (member: GroupMember) => void;
  chatDisabled?: boolean;
}

export default function GroupMemberItem({
  member,
  onChat,
  chatDisabled,
}: Readonly<GroupMemberItemProps>): React.JSX.Element {
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
          {member.rol}
        </Text>
      </View>

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
