import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, themeColors } from '@/constants/colors';
import AttachmentPicker from '@/features/chat/components/AttachmentPicker';
import { useAudioRecorder } from '@/features/chat/hooks/useAudioRecorder';
import { useTheme } from '@/store/ThemeContext';
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColors(isDark);
  const iconMuted = isDark ? colors.admMutedD : colors.admMutedL;

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
      className="border-t border-rassa-border bg-rassa-surface p-2 dark:border-rassa-border-dark dark:bg-rassa-surface-dark"
      style={{ paddingBottom: insets.bottom + 6 }}
    >
      {recorder.error ? (
        <Text className="mb-1 text-xs" style={{ color: colors.brandRedCoral }}>
          {recorder.error}
        </Text>
      ) : null}
      {selectedFile ? (
        <View className="mb-1 flex-row items-center gap-2 rounded-lg border border-rassa-border bg-rassa-bg px-2 py-1.5 dark:border-rassa-border-dark dark:bg-rassa-surface-dark">
          <MaterialCommunityIcons
            name={TYPE_ICON[selectedKind ?? ATTACHMENT_TYPES.IMAGEN]}
            size={18}
            color={iconMuted}
          />
          <Text
            className="flex-1 text-sm text-rassa-fg dark:text-rassa-fg-dark"
            numberOfLines={1}
          >
            {selectedFile.name}
          </Text>
          <View
            className="rounded px-1.5 py-0.5"
            style={{ backgroundColor: theme.brand }}
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
            <MaterialCommunityIcons name="close" size={18} color={iconMuted} />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-center">
        {recorder.isRecording ? (
          <>
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-rassa-error" />
              <Text className="text-sm text-rassa-fg dark:text-rassa-fg-dark">
                Grabando… {recorder.elapsed}s
              </Text>
            </View>
            <IconButton
              icon="stop"
              size={24}
              iconColor={theme.brand}
              style={{ margin: 0 }}
              accessibilityLabel="Detener y enviar audio"
              onPress={() => void handleStopRecording()}
            />
            <IconButton
              icon="close"
              size={24}
              iconColor={iconMuted}
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
                  iconColor={iconMuted}
                  style={{ margin: 0 }}
                  accessibilityLabel="Adjuntar archivo"
                />
              </AttachmentPicker>
            ) : null}

            {onSendMedia ? (
              <IconButton
                icon="microphone"
                size={24}
                iconColor={iconMuted}
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
              contentStyle={{ minHeight: 44, textAlignVertical: 'center' }}
              outlineStyle={{ borderRadius: 24 }}
            />

            <IconButton
              icon="send"
              size={24}
              disabled={!canSend}
              onPress={handleSend}
              iconColor={theme.brand}
              style={{ margin: 0 }}
              accessibilityLabel="Enviar mensaje"
            />
          </>
        )}
      </View>
    </View>
  );
}
