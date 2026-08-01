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
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Text,
  View,
} from 'react-native';
import type { KeyboardEvent } from 'react-native';

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
import type {
  AttachmentType,
  ChatStackParamList,
  Message,
  SendMessageWithMediaPayload,
} from '@/types/chat';

type ChatNavigation = NativeStackNavigationProp<ChatStackParamList, 'Chat'>;

export default function ChatScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ChatStackParamList, 'Chat'>>();
  const navigation = useNavigation<ChatNavigation>();
  const { conversationId, tipo, isFamily } = route.params;
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
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateTo = (value: number) => {
      Animated.timing(keyboardHeight, {
        toValue: value,
        duration: Platform.OS === 'ios' ? 250 : 180,
        useNativeDriver: false,
      }).start();
    };
    const showEvent = (event: KeyboardEvent) => {
      animateTo(event.endCoordinates.height);
    };
    const hideEvent = () => {
      animateTo(0);
    };
    const willShowSub = Keyboard.addListener('keyboardWillShow', showEvent);
    const didShowSub = Keyboard.addListener('keyboardDidShow', showEvent);
    const willHideSub = Keyboard.addListener('keyboardWillHide', hideEvent);
    const didHideSub = Keyboard.addListener('keyboardDidHide', hideEvent);
    return () => {
      willShowSub.remove();
      didShowSub.remove();
      willHideSub.remove();
      didHideSub.remove();
    };
  }, [keyboardHeight]);

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

  useEffect(() => {
    if (!conversationId) return;
    const timer = setTimeout(() => {
      markAsRead.mutate(conversationId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [conversationId, markAsRead]);

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
      contenido?: string,
    ) => {
      const payload: SendMessageWithMediaPayload = {
        conversacion: conversationId,
        tipo_documento: kind,
        documento: { uri: file.uri, name: file.name, type: file.type },
        remitente: user?.id ?? 0,
        remitente_nombre: user?.nombre ?? '',
      };
      if (contenido) {
        payload.contenido = contenido;
      }
      sendMediaMutation.mutate(payload);
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
      <View className="flex-1 items-center justify-center bg-rassa-bg dark:bg-rassa-bg-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-rassa-bg p-4 dark:bg-rassa-bg-dark">
        <Text className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark">
          Error al cargar mensajes. Toca Reintentar.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      className="flex-1 bg-rassa-bg dark:bg-rassa-bg-dark"
      style={{ paddingBottom: keyboardHeight }}
    >
      {sortedMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-base text-rassa-muted dark:text-rassa-muted-dark">
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
    </Animated.View>
  );
}
