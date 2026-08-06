import React from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ConversationItem from '@/features/chat/components/ConversationItem';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList } from '@/types/chat';

export default function ChatListScreen(): React.JSX.Element {
  const { data, isLoading, error } = useConversations();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const { user } = useAuth();
  const canManage = user?.role !== 'buyer';

  const conversations = data?.results ?? [];

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
          Error al cargar conversaciones. Toca Reintentar.
        </Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-rassa-bg p-4 dark:bg-rassa-bg-dark">
        <Text className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark">
          No hay conversaciones aún
        </Text>
        {canManage ? (
          <FAB
            icon="plus"
            label="Nuevo chat"
            onPress={() => navigation.navigate('StartChat')}
            className="mt-4"
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-rassa-bg dark:bg-rassa-bg-dark">
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ConversationItem conversation={item} />}
        ItemSeparatorComponent={() => (
          <ItemSeparator count={conversations.length} />
        )}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
      {canManage ? (
        <FAB
          icon="plus"
          label="Nuevo chat"
          onPress={() => navigation.navigate('StartChat')}
          className="absolute right-4 bottom-4"
        />
      ) : null}
    </View>
  );
}

function ItemSeparator({ count }: Readonly<{ count: number }>) {
  return (
    <View
      // include count as accessibility label so the component receives data via props
      accessibilityLabel={`separator-${count}`}
      className="h-px bg-rassa-border dark:bg-rassa-border-dark"
    />
  );
}
