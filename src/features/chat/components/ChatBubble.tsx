import React, { useEffect, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { IconButton, Menu } from "react-native-paper";

import { formatMessageTime } from "@rassa/chat";

import { useCanModifyMessage } from "@/features/chat/hooks/useCanModifyMessage";
import { mediaUrl } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import type { Attachment, Message } from "@/types/chat";
import { ATTACHMENT_TYPES } from "@/types/chat";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
}

function resolveMediaUri(path: string): string {
  if (/^(https?|file|content|blob):/i.test(path)) return path;
  return mediaUrl(path) ?? path;
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function audioMimeType(name: string): string {
  if (name.toLowerCase().endsWith(".mp3")) return "audio/mpeg";
  if (name.toLowerCase().endsWith(".m4a")) return "audio/mp4";
  if (name.toLowerCase().endsWith(".ogg")) return "audio/ogg";
  return "audio/wav";
}

async function downloadAudio(attachment: Attachment): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        "Descarga no disponible",
        "Compartir no está disponible en este dispositivo.",
      );
      return;
    }
    const fileName = attachment.nombre || "audio.wav";
    const destination = new File(Paths.cache, fileName);
    const downloaded = await File.downloadFileAsync(
      resolveMediaUri(attachment.archivo),
      destination,
    );
    await Sharing.shareAsync(downloaded.uri, {
      mimeType: audioMimeType(fileName),
      dialogTitle: "Descargar audio",
    });
  } catch {
    Alert.alert("Error", "No se pudo descargar el audio.");
  }
}

function AudioPlayer({
  attachment,
  isOwn,
}: Readonly<{ attachment: Attachment; isOwn: boolean }>) {
  const player = useAudioPlayer(resolveMediaUri(attachment.archivo));
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View
      className={`mb-1 flex-row items-center gap-2 rounded-lg px-3 py-2 ${
        isOwn ? "bg-white/10" : "bg-gray-100 dark:bg-gray-700"
      }`}
    >
      <IconButton
        icon={status.playing ? "pause" : "play"}
        size={20}
        iconColor={isOwn ? "#ffffff" : "#6b7280"}
        onPress={togglePlayback}
        accessibilityLabel={`Reproducir audio: ${attachment.nombre}`}
      />
      <View className="flex-1">
        <Text
          className={`text-xs ${
            isOwn ? "text-white/80" : "text-gray-600 dark:text-gray-300"
          }`}
          numberOfLines={1}
        >
          {attachment.nombre}
        </Text>
        <Text
          className={`text-xs ${
            isOwn ? "text-white/50" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {formatAudioTime(status.currentTime)} /{" "}
          {formatAudioTime(status.duration)}
        </Text>
      </View>
      <IconButton
        icon="download"
        size={20}
        iconColor={isOwn ? "#ffffff" : "#6b7280"}
        onPress={() => void downloadAudio(attachment)}
        accessibilityLabel={`Descargar audio: ${attachment.nombre}`}
      />
    </View>
  );
}

function renderAttachment(
  attachment: Attachment,
  isOwn: boolean,
): React.JSX.Element {
  switch (attachment.tipo) {
    case ATTACHMENT_TYPES.IMAGEN:
      return (
        <Image
          source={{ uri: resolveMediaUri(attachment.archivo) }}
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
      return <AudioPlayer attachment={attachment} isOwn={isOwn} />;
    default:
      return (
        <Text
          className={`text-xs italic ${
            isOwn ? "text-white/60" : "text-gray-400"
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
          isOwn ? "self-end" : "self-start"
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
              ? "self-end rounded-br-md bg-gray-700 dark:bg-gray-600"
              : "self-start rounded-bl-md bg-white dark:bg-gray-800"
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
                className={`text-base ${isOwn ? "text-white" : "text-gray-900 dark:text-gray-100"}`}
              >
                {message.contenido}
              </Text>
            ) : null}

            <Text
              className={`mt-1 self-end text-xs ${
                isOwn ? "text-white/70" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {formatMessageTime(message.creado_en)}
              {message.editado ? " · editado" : ""}
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
