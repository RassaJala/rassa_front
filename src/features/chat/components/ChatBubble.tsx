import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { IconButton, Menu } from 'react-native-paper';

import { formatMessageTime } from '@rassa/chat';

import { useCanModifyMessage } from '@/features/chat/hooks/useCanModifyMessage';
import { useAuth } from '@/store/AuthContext';
import type { Attachment, Message } from '@/types/chat';
import { ATTACHMENT_TYPES } from '@/types/chat';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
}

function renderAttachment(
  attachment: Attachment,
  isOwn: boolean,
): React.JSX.Element {
  switch (attachment.tipo) {
    case ATTACHMENT_TYPES.IMAGEN:
      return (
        <Image
          source={{ uri: attachment.archivo }}
          className="mb-1 h-48 w-48 rounded-lg"
          resizeMode="cover"
          accessibilityLabel={attachment.nombre}
        />
      );
    case ATTACHMENT_TYPES.VIDEO:
      return (
        <View className="mb-1 h-48 w-48 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
          <IconButton
            icon="play-circle"
            size={48}
            iconColor="#ffffff"
            accessibilityLabel={`Reproducir video: ${attachment.nombre}`}
          />
          <Text className="text-xs text-white/70">{attachment.nombre}</Text>
        </View>
      );
    case ATTACHMENT_TYPES.AUDIO:
      return (
        <View
          className={`mb-1 flex-row items-center gap-2 rounded-lg px-3 py-2 ${
            isOwn ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          <IconButton
            icon="play"
            size={20}
            iconColor={isOwn ? '#ffffff' : '#6b7280'}
            accessibilityLabel={`Reproducir audio: ${attachment.nombre}`}
          />
          <Text
            className={`flex-1 text-xs ${
              isOwn ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'
            }`}
            numberOfLines={1}
          >
            {attachment.nombre}
          </Text>
        </View>
      );
    default:
      return (
        <Text
          className={`text-xs italic ${
            isOwn ? 'text-white/60' : 'text-gray-400'
          }`}
        >
          Archivo adjunto no soportado
        </Text>
      );
  }
}

export default function ChatBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
}: Readonly<ChatBubbleProps>): React.JSX.Element {
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const { canEdit, canDelete } = useCanModifyMessage(message);

  const isDeleted = message.activo === false;
  const isAuthor = user?.id === message.remitente;
  const showMenu = isOwn && isAuthor && !isDeleted;

  if (isDeleted) {
    return (
      <View
        className={`mb-2 max-w-[80%] rounded-2xl px-4 py-2 ${
          isOwn ? 'self-end' : 'self-start'
        }`}
      >
        <Text className="text-sm text-gray-400 italic dark:text-gray-500">
          Mensaje eliminado
        </Text>
      </View>
    );
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <View
          className={`mb-2 max-w-[80%] rounded-2xl px-4 py-2 ${
            isOwn
              ? 'self-end rounded-br-md bg-gray-700 dark:bg-gray-600'
              : 'self-start rounded-bl-md bg-white dark:bg-gray-800'
          }`}
          onStartShouldSetResponder={() => false}
        >
          <Pressable
            onLongPress={() => {
              if (showMenu) setMenuVisible(true);
            }}
            accessibilityRole="button"
          >
            {!isOwn && (
              <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {message.remitente_nombre}
              </Text>
            )}

            {message.adjuntos?.map((att) => (
              <React.Fragment key={att.id}>
                {renderAttachment(att, isOwn)}
              </React.Fragment>
            ))}

            {message.contenido ? (
              <Text
                className={`text-base ${isOwn ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}
              >
                {message.contenido}
              </Text>
            ) : null}

            <Text
              className={`mt-1 self-end text-xs ${
                isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {formatMessageTime(message.creado_en)}
              {message.editado ? ' · editado' : ''}
            </Text>
          </Pressable>
        </View>
      }
    >
      <Menu.Item
        onPress={() => {
          setMenuVisible(false);
          onEdit?.(message);
        }}
        title="Editar"
        disabled={!canEdit}
      />
      <Menu.Item
        onPress={() => {
          setMenuVisible(false);
          onDelete?.(message.id);
        }}
        title="Eliminar"
        disabled={!canDelete}
      />
    </Menu>
  );
}
