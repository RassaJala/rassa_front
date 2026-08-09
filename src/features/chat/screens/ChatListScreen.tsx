import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { FAB } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import ConversationItem from '@/features/chat/components/ConversationItem';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList } from '@/types/chat';

export default function ChatListScreen(): React.JSX.Element {
  const { data, isLoading, error, refetch, isFetching } = useConversations();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const { user } = useAuth();
  const canManage = user?.role !== 'buyer';

  const conversations = data?.results ?? [];

  // MAJOR #5 (#82): if we already have conversation data, a transient failure
  // (backend restart, proxy blip) must NOT hide it behind a full-screen error.
  // Show the list plus a non-blocking banner instead. The blocking error is
  // reserved for the case where there is no cached data at all.
  if (error && conversations.length > 0) {
    return (
      <View className="flex-1 bg-rassa-bg dark:bg-rassa-bg-dark">
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationItem conversation={item} />}
          ListHeaderComponent={() => (
            <View
              accessibilityRole="alert"
              className="mx-3 mt-3 rounded-lg p-3"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-sm" style={{ color: colors.error }}>
                Error al cargar conversaciones
              </Text>
              <Pressable
                onPress={() => void refetch()}
                disabled={isFetching}
                accessibilityLabel="Reintentar cargar conversaciones"
                className="mt-2 self-start rounded-lg px-3 py-1"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isFetching ? 0.6 : 1,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: colors.iconWhite }}
                >
                  {isFetching ? 'Reintentando…' : 'Reintentar'}
                </Text>
              </Pressable>
            </View>
          )}
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
        <Text
          accessibilityRole="alert"
          className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark"
        >
          Error al cargar conversaciones
        </Text>
        <Pressable
          onPress={() => void refetch()}
          disabled={isFetching}
          accessibilityLabel="Reintentar cargar conversaciones"
          className="mt-4 rounded-lg px-5 py-2"
          style={{
            backgroundColor: colors.primary,
            opacity: isFetching ? 0.6 : 1,
          }}
        >
          <Text className="font-medium" style={{ color: colors.iconWhite }}>
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </Text>
        </Pressable>
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
