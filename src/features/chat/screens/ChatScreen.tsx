import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import ChatBubble from '@/features/chat/components/ChatBubble';
import ChatInput from '@/features/chat/components/ChatInput';
import MessageEditModal from '@/features/chat/components/MessageEditModal';
import { useChatMessages } from '@/features/chat/hooks/useChatMessages';
import { useDeleteMessage } from '@/features/chat/hooks/useDeleteMessage';
import { useEditMessage } from '@/features/chat/hooks/useEditMessage';
import { useMarkAsRead } from '@/features/chat/hooks/useMarkAsRead';
import { useSendMessage } from '@/features/chat/hooks/useSendMessage';
import { useSendMessageWithMedia } from '@/features/chat/hooks/useSendMessageWithMedia';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AttachmentType, ChatStackParamList, Message } from '@/types/chat';

type ChatNavigation = NativeStackNavigationProp<ChatStackParamList, 'Chat'>;

export default function ChatScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ChatStackParamList, 'Chat'>>();
  const navigation = useNavigation<ChatNavigation>();
  const { conversationId, tipo, isFamily, nombreOverride } = route.params;
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const groupIconColor =
    colorScheme === 'dark' ? colors.admBrandD : colors.admBrandL;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(conversationId);

  const sendMessageMutation = useSendMessage(conversationId);
  const sendMediaMutation = useSendMessageWithMedia(conversationId);
  const editMessageMutation = useEditMessage(conversationId);
  const deleteMessageMutation = useDeleteMessage(conversationId);
  const markAsRead = useMarkAsRead();
  const markedRef = useRef<Set<number>>(new Set());
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params.title,
      ...(tipo === 'grupal'
        ? {
            headerRight: () => (
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={groupIconColor}
                onPress={() => {
                  navigation.navigate('GroupDetail', {
                    conversationId,
                    title: route.params.title,
                    isFamily,
                    nombreOverride,
                  });
                }}
                style={{ marginRight: 16 }}
              />
            ),
          }
        : {}),
    });
  }, [
    navigation,
    tipo,
    conversationId,
    route.params.title,
    isFamily,
    nombreOverride,
    groupIconColor,
  ]);

  const messages = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data],
  );
  // Inverted FlatList displays newest items at the bottom; keep data newest-first
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime(),
      ),
    [messages],
  );

  // Auto-mark unread messages from other participant as read
  useEffect(() => {
    if (!user?.id) return;
    for (const msg of messages) {
      if (
        msg.remitente !== user.id &&
        !msg.leido &&
        !markedRef.current.has(msg.id)
      ) {
        markedRef.current.add(msg.id);
        markAsRead.mutate(msg.id);
      }
    }
  }, [messages, user?.id, markAsRead]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessageMutation.mutate({
        conversacion: conversationId,
        contenido: text,
      });
    },
    [conversationId, sendMessageMutation],
  );

  const handleSendMedia = useCallback(
    (
      file: { uri: string; name: string; type: string },
      kind: AttachmentType,
    ) => {
      sendMediaMutation.mutate({
        conversacion: conversationId,
        tipo_documento: kind,
        documento: { uri: file.uri, name: file.name, type: file.type },
        remitente: user?.id ?? 0,
        remitente_nombre: user?.nombre ?? '',
      });
    },
    [conversationId, sendMediaMutation, user],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEdit = useCallback((message: Message) => {
    setEditingMessage(message);
  }, []);

  const handleDelete = useCallback(
    (messageId: number) => {
      deleteMessageMutation.mutate(messageId);
    },
    [deleteMessageMutation],
  );

  const handleSaveEdit = useCallback(
    (newContent: string) => {
      if (!editingMessage) return;
      editMessageMutation.mutate(
        { messageId: editingMessage.id, contenido: newContent },
        { onSuccess: () => setEditingMessage(null) },
      );
    },
    [editingMessage, editMessageMutation],
  );

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
          Error al cargar mensajes. Toca Reintentar.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {sortedMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-base text-gray-500 dark:text-gray-400">
            No hay mensajes aún. ¡Escribe el primero!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedMessages}
          inverted
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isOwn={item.remitente === user?.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" className="py-2" />
            ) : null
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />
      )}

      <ChatInput onSend={handleSend} onSendMedia={handleSendMedia} />

      <MessageEditModal
        visible={editingMessage !== null}
        currentContent={editingMessage?.contenido ?? ''}
        onDismiss={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
        saving={editMessageMutation.isPending}
      />
    </KeyboardAvoidingView>
  );
}
