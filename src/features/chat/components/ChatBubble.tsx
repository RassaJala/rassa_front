import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconButton, Menu } from "react-native-paper";

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";

import { formatMessageTime } from "@rassa/chat";

import { colors } from "@/constants/colors";
import { useCanModifyMessage } from "@/features/chat/hooks/useCanModifyMessage";
import { mediaUrl } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/store/ThemeContext";
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

function mimeTypeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function defaultFileName(attachment: Attachment): string {
  if (attachment.nombre) return attachment.nombre;
  switch (attachment.tipo) {
    case ATTACHMENT_TYPES.IMAGEN:
      return "imagen.jpg";
    case ATTACHMENT_TYPES.VIDEO:
      return "video.mp4";
    case ATTACHMENT_TYPES.AUDIO:
      return "audio.wav";
    default:
      return "archivo";
  }
}

async function downloadAttachment(attachment: Attachment): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        "Descarga no disponible",
        "Compartir no está disponible en este dispositivo.",
      );
      return;
    }
    const fileName = defaultFileName(attachment);
    const destination = new File(Paths.cache, fileName);
    const downloaded = await File.downloadFileAsync(
      resolveMediaUri(attachment.archivo),
      destination,
    );
    await Sharing.shareAsync(downloaded.uri, {
      mimeType: mimeTypeFor(fileName),
      dialogTitle: "Descargar archivo",
    });
  } catch {
    Alert.alert("Error", "No se pudo descargar el archivo.");
  }
}

function AudioPlayer({
  attachment,
  isOwn,
}: Readonly<{ attachment: Attachment; isOwn: boolean }>) {
  const player = useAudioPlayer(resolveMediaUri(attachment.archivo));
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);

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

  const duration = status.duration;
  const progress =
    duration > 0 ? Math.min(100, (status.currentTime / duration) * 100) : 0;

  const seekTo = (locationX: number) => {
    if (duration <= 0 || trackWidth <= 0) return;
    void player.seekTo((locationX / trackWidth) * duration);
  };

  return (
    <View
      className={`mb-1 flex-row items-center gap-2 rounded-lg px-3 py-2 ${
        isOwn ? "bg-white/10" : "bg-gray-100 dark:bg-gray-800"
      }`}
    >
      <IconButton
        icon={status.playing ? "pause" : "play"}
        size={20}
        iconColor={isOwn ? "#ffffff" : "#6b7280"}
        onPress={togglePlayback}
        accessibilityLabel={`Reproducir audio: ${attachment.nombre}`}
      />
      <View className="flex-1 gap-1">
        <Text
          className={`text-xs ${
            isOwn ? "text-white/80" : "text-gray-600 dark:text-gray-300"
          }`}
          numberOfLines={1}
        >
          {attachment.nombre}
        </Text>
        <Pressable
          className="h-3 justify-center"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => seekTo(e.nativeEvent.locationX)}
          accessibilityRole="adjustable"
          accessibilityLabel={`Progreso de audio: ${attachment.nombre}`}
        >
          <View
            className={`h-1.5 overflow-hidden rounded-full ${
              isOwn ? "bg-white/20" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <View
              className={`h-full rounded-full ${
                isOwn ? "bg-white/80" : "bg-brand-green-forest"
              }`}
              style={{ width: `${progress}%` }}
            />
          </View>
        </Pressable>
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
        onPress={() => void downloadAttachment(attachment)}
        accessibilityLabel={`Descargar audio: ${attachment.nombre}`}
      />
    </View>
  );
}

function VideoPlayer({
  attachment,
  isOwn,
}: Readonly<{ attachment: Attachment; isOwn: boolean }>) {
  const player = useVideoPlayer(resolveMediaUri(attachment.archivo));
  return (
    <View className="mb-1 gap-1">
      <VideoView
        player={player}
        className="h-48 w-48 rounded-lg bg-black"
        contentFit="contain"
      />
      <View className="flex-row items-center justify-end">
        <IconButton
          icon="download"
          size={20}
          iconColor={isOwn ? "#ffffff" : "#6b7280"}
          onPress={() => void downloadAttachment(attachment)}
          accessibilityLabel={`Descargar video: ${attachment.nombre}`}
        />
      </View>
    </View>
  );
}

function bubbleGradientFor(
  isOwn: boolean,
  isDark: boolean,
): readonly [string, string] {
  if (isOwn) {
    return isDark
      ? [colors.admBrandD, colors.brandGreenForest]
      : [colors.admBrandL, colors.brandGreenForest];
  }
  return isDark
    ? [colors.admSurfaceD, colors.brandInk]
    : [colors.surface, colors.admBorderL];
}

function renderAttachment(
  attachment: Attachment,
  isOwn: boolean,
  onImagePress: (uri: string) => void,
): React.JSX.Element {
  switch (attachment.tipo) {
    case ATTACHMENT_TYPES.IMAGEN:
      return (
        <View className="mb-1">
          <Pressable
            onPress={() => onImagePress(resolveMediaUri(attachment.archivo))}
            accessibilityRole="button"
            accessibilityLabel={`Ampliar imagen: ${attachment.nombre}`}
          >
            <Image
              source={{ uri: resolveMediaUri(attachment.archivo) }}
              className="h-48 w-48 rounded-lg"
              resizeMode="cover"
              accessibilityLabel={attachment.nombre}
            />
          </Pressable>
          <View className="flex-row items-center justify-end">
            <IconButton
              icon="download"
              size={20}
              iconColor={isOwn ? "#ffffff" : "#6b7280"}
              onPress={() => void downloadAttachment(attachment)}
              accessibilityLabel={`Descargar imagen: ${attachment.nombre}`}
            />
          </View>
        </View>
      );
    case ATTACHMENT_TYPES.VIDEO:
      return <VideoPlayer attachment={attachment} isOwn={isOwn} />;
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const { canEdit, canDelete } = useCanModifyMessage(message);

  const bubbleGradient = bubbleGradientFor(isOwn, isDark);

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
    <>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
      anchor={
        <View
          className={`mb-2 max-w-[80%] overflow-hidden rounded-2xl px-4 py-2 ${
            isOwn ? "self-end rounded-br-md" : "self-start rounded-bl-md"
          }`}
          onStartShouldSetResponder={() => false}
        >
          <LinearGradient
            colors={bubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
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
                {renderAttachment(att, isOwn, (uri) =>
                  setSelectedImageUri(uri),
                )}
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
      <Modal
        visible={selectedImageUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/90 p-4">
          <Pressable
            className="absolute inset-0"
            onPress={() => setSelectedImageUri(null)}
            accessibilityLabel="Cerrar imagen"
          />
          {selectedImageUri !== null && (
            <Image
              source={{ uri: selectedImageUri }}
              className={`${message.contenido ? "h-[70%]" : "h-[85%]"} w-full rounded-lg`}
              resizeMode="contain"
              accessibilityLabel="Imagen ampliada"
            />
          )}
          {message.contenido ? (
            <Text className="mt-4 max-w-[90%] text-center text-base text-white">
              {message.contenido}
            </Text>
          ) : null}
          <Pressable
            className="absolute right-4 top-10"
            onPress={() => setSelectedImageUri(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen ampliada"
          >
            <View className="h-8 w-8 items-center justify-center rounded-full bg-black/50">
              <Text className="text-lg text-white">✕</Text>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
