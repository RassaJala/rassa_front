import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import AttachmentPicker from '@/features/chat/components/AttachmentPicker';
import { useAudioRecorder } from '@/features/chat/hooks/useAudioRecorder';
import { ATTACHMENT_TYPES } from '@/types/chat';
import type { AttachmentType } from '@/types/chat';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (
    file: SelectedFile,
    kind: AttachmentType,
    contenido?: string,
  ) => void;
}

const TYPE_LABEL: Record<AttachmentType, string> = {
  imagen: 'Imagen',
  audio: 'Audio',
  video: 'Video',
};

const TYPE_ICON = {
  imagen: 'image-outline',
  audio: 'music-note',
  video: 'film',
} as const satisfies Record<AttachmentType, string>;

export default function ChatInput({
  onSend,
  onSendMedia,
}: Readonly<ChatInputProps>): React.JSX.Element {
  const recorder = useAudioRecorder();
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [selectedKind, setSelectedKind] = useState<AttachmentType | null>(null);
  const insets = useSafeAreaInsets();

  const canSend = text.trim().length > 0 || selectedFile !== null;

  const handleSelected = (file: SelectedFile, kind: AttachmentType) => {
    setSelectedFile(file);
    setSelectedKind(kind);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSelectedKind(null);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (selectedFile && onSendMedia) {
      onSendMedia(
        selectedFile,
        selectedKind ?? ATTACHMENT_TYPES.IMAGEN,
        trimmed || undefined,
      );
      removeFile();
      setText('');
      return;
    }
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleStopRecording = async () => {
    const file = await recorder.stopRecording();
    if (file && onSendMedia) {
      onSendMedia(file, ATTACHMENT_TYPES.AUDIO);
    }
  };

  return (
    <View
      className="border-t border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900"
      style={{ paddingBottom: insets.bottom + 6 }}
    >
      {recorder.error ? (
        <Text className="mb-1 text-xs" style={{ color: colors.brandRedCoral }}>
          {recorder.error}
        </Text>
      ) : null}
      {selectedFile ? (
        <View className="mb-1 flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800">
          <MaterialCommunityIcons
            name={TYPE_ICON[selectedKind ?? ATTACHMENT_TYPES.IMAGEN]}
            size={18}
            color={colors.textSecondary}
          />
          <Text
            className="flex-1 text-sm text-gray-700 dark:text-gray-200"
            numberOfLines={1}
          >
            {selectedFile.name}
          </Text>
          <View
            className="rounded px-1.5 py-0.5"
            style={{ backgroundColor: colors.brandPrimary }}
          >
            <Text className="text-xs font-medium text-white">
              {TYPE_LABEL[selectedKind ?? ATTACHMENT_TYPES.IMAGEN]}
            </Text>
          </View>
          <Pressable
            onPress={removeFile}
            accessibilityLabel="Quitar archivo"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-center">
        {recorder.isRecording ? (
          <>
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                Grabando… {recorder.elapsed}s
              </Text>
            </View>
            <IconButton
              icon="stop"
              size={24}
              iconColor="#DE393A"
              style={{ margin: 0 }}
              accessibilityLabel="Detener y enviar audio"
              onPress={() => void handleStopRecording()}
            />
            <IconButton
              icon="close"
              size={24}
              iconColor="#6b7280"
              style={{ margin: 0 }}
              accessibilityLabel="Cancelar grabación"
              onPress={() => void recorder.cancelRecording()}
            />
          </>
        ) : (
          <>
            {onSendMedia ? (
              <AttachmentPicker onSelected={handleSelected}>
                <IconButton
                  icon="paperclip"
                  size={24}
                  iconColor="#6b7280"
                  style={{ margin: 0 }}
                  accessibilityLabel="Adjuntar archivo"
                />
              </AttachmentPicker>
            ) : null}

            {onSendMedia ? (
              <IconButton
                icon="microphone"
                size={24}
                iconColor="#6b7280"
                style={{ margin: 0 }}
                accessibilityLabel="Grabar audio"
                onPress={() => void recorder.startRecording()}
              />
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
          </>
        )}
      </View>
    </View>
  );
}
