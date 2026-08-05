import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatConversationTime } from '@rassa/chat';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import { themeColors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { ChatStackParamList, Conversation } from '@/types/chat';

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({
  conversation,
}: Readonly<ConversationItemProps>): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ChatStackParamList>>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColors(isDark);

  return (
    <Pressable
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: conversation.id,
          title:
            conversation.tipo === 'grupal'
              ? conversation.nombre
              : conversation.participante_nombre,
          tipo: conversation.tipo,
          isFamily: conversation.es_familia,
          nombreOverride: conversation.nombre_override,
        })
      }
      className="flex-row items-center gap-3 bg-rassa-surface p-4 dark:bg-rassa-surface-dark"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-rassa-border dark:bg-rassa-border-dark">
        {conversation.tipo === 'grupal' ? (
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color={theme.muted}
          />
        ) : (
          <Text className="text-sm font-medium text-rassa-muted dark:text-rassa-muted-dark">
            {(conversation.participante_nombre || '?')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="text-sm font-medium text-rassa-fg dark:text-rassa-fg-dark"
            numberOfLines={1}
          >
            {conversation.es_familia ? '🏠 ' : ''}
            {conversation.tipo === 'grupal'
              ? conversation.nombre
              : conversation.participante_nombre}
          </Text>
          <Text className="text-xs text-rassa-muted dark:text-rassa-muted-dark">
            {formatConversationTime(conversation.ultimo_mensaje_fecha)}
          </Text>
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text
            className="flex-1 text-sm text-rassa-muted dark:text-rassa-muted-dark"
            numberOfLines={1}
          >
            {conversation.ultimo_mensaje ?? 'Sin mensajes aún'}
          </Text>

          {conversation.no_leidos > 0 && (
            <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-rassa-error px-1.5">
              <Text className="text-xs font-medium text-white">
                {conversation.no_leidos > 99
                  ? '99+'
                  : String(conversation.no_leidos)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
