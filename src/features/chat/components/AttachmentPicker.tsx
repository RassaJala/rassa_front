import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { Menu } from 'react-native-paper';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { isVideoAsset, validateSize } from '@rassa/chat';

import { ATTACHMENT_TYPES } from '@/types/chat';
import type { AttachmentType } from '@/types/chat';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  mimeType: string;
}

interface AttachmentPickerProps {
  onSelected: (file: SelectedFile, kind: AttachmentType) => void;
  children: React.ReactNode;
}

export default function AttachmentPicker({
  onSelected,
  children,
}: Readonly<AttachmentPickerProps>): React.JSX.Element {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleImage = async () => {
    setMenuVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets.at(0);
    if (!asset) return;

    if (!validateSize(asset.fileSize ?? 0)) {
      Alert.alert('Archivo muy grande', 'El archivo no puede superar 20 MB.');
      return;
    }

    const isVideo = isVideoAsset(asset.type);
    onSelected(
      {
        uri: asset.uri,
        name: asset.fileName ?? `media_${Date.now()}`,
        type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      },
      isVideo ? ATTACHMENT_TYPES.VIDEO : ATTACHMENT_TYPES.IMAGEN,
    );
  };

  const handleAudio = async () => {
    setMenuVisible(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets.at(0);
    if (!file) return;

    if (!validateSize(file.size ?? 0)) {
      Alert.alert('Archivo muy grande', 'El archivo no puede superar 20 MB.');
      return;
    }

    onSelected(
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'audio/mpeg',
        mimeType: file.mimeType ?? 'audio/mpeg',
      },
      ATTACHMENT_TYPES.AUDIO,
    );
  };

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <Pressable onPress={() => setMenuVisible(true)}>{children}</Pressable>
      }
    >
      <Menu.Item onPress={handleImage} title="Imagen / Video" />
      <Menu.Item onPress={handleAudio} title="Audio" />
    </Menu>
  );
}

export type { SelectedFile };
