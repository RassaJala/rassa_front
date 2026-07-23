import React, { useState } from 'react';
import { View } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';

import AttachmentPicker from '@/features/chat/components/AttachmentPicker';
import type { AttachmentType } from '@/types/chat';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: SelectedFile, kind: AttachmentType) => void;
}

export default function ChatInput({
  onSend,
  onSendMedia,
}: Readonly<ChatInputProps>): React.JSX.Element {
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View className="flex-row items-end border-t border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
      {onSendMedia ? (
        <AttachmentPicker onSelected={onSendMedia}>
          <IconButton
            icon="paperclip"
            size={24}
            iconColor="#6b7280"
            style={{ margin: 0 }}
            accessibilityLabel="Adjuntar archivo"
          />
        </AttachmentPicker>
      ) : null}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Escribe un mensaje..."
        mode="outlined"
        multiline
        numberOfLines={1}
        dense
        style={{ flex: 1 }}
        contentStyle={{ minHeight: 44 }}
        outlineStyle={{ borderRadius: 24 }}
      />

      <IconButton
        icon="send"
        size={24}
        disabled={!canSend}
        onPress={handleSend}
        iconColor="#DE393A"
        style={{ margin: 0 }}
        accessibilityLabel="Enviar mensaje"
      />
    </View>
  );
}
