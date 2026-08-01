import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconButton, Menu } from 'react-native-paper';
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnProgressData,
  type VideoRef,
  ViewType,
} from 'react-native-video';

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { getThumbnailAsync } from 'expo-video-thumbnails';

import { formatMessageTime } from '@rassa/chat';

import { colors, themeColors } from '@/constants/colors';
import { useCanModifyMessage } from '@/features/chat/hooks/useCanModifyMessage';
import { mediaUrl } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { Attachment, Message } from '@/types/chat';
import { ATTACHMENT_TYPES } from '@/types/chat';

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
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const channelA = Number.parseInt(a.slice(i, i + 2), 16);
    const channelB = Number.parseInt(b.slice(i, i + 2), 16);
    return Math.round(channelA * (1 - weightB) + channelB * weightB)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function mimeTypeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function defaultFileName(attachment: Attachment): string {
  if (attachment.nombre) return attachment.nombre;
  switch (attachment.tipo) {
    case ATTACHMENT_TYPES.IMAGEN:
      return 'imagen.jpg';
    case ATTACHMENT_TYPES.VIDEO:
      return 'video.mp4';
    case ATTACHMENT_TYPES.AUDIO:
      return 'audio.wav';
    default:
      return 'archivo';
  }
}

async function downloadAttachment(attachment: Attachment): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Descarga no disponible',
        'Compartir no está disponible en este dispositivo.',
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
      dialogTitle: 'Descargar archivo',
    });
  } catch {
    Alert.alert('Error', 'No se pudo descargar el archivo.');
  }
}

function audioPalette(
  isOwn: boolean,
  isDark: boolean,
): Readonly<{
  container: string;
  track: string;
  fill: string;
}> {
  if (isOwn) {
    return {
      container: isDark ? 'bg-black/25' : 'bg-black/5',
      track: isDark ? 'bg-white/20' : 'bg-black/10',
      fill: isDark ? 'bg-white/80' : 'bg-gray-800',
    };
  }
  return {
    container: isDark ? 'bg-black/20' : 'bg-black/5',
    track: 'bg-gray-300 dark:bg-gray-600',
    fill: 'bg-brand-green-forest',
  };
}

function AudioPlayerInner({
  attachment,
  isOwn,
}: Readonly<{ attachment: Attachment; isOwn: boolean }>) {
  const player = useAudioPlayer(resolveMediaUri(attachment.archivo));
  const status = useAudioPlayerStatus(player);
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColors(isDark);
  const accentColor = isOwn
    ? isDark
      ? colors.iconWhite
      : theme.fg
    : theme.muted;
  const palette = audioPalette(isOwn, isDark);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const togglePlayback = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      return;
    }
  };

  const duration = status.duration;
  const progress =
    duration > 0 ? Math.min(100, (status.currentTime / duration) * 100) : 0;

  const seekTo = (locationX: number) => {
    if (duration <= 0 || trackWidth <= 0) return;
    try {
      void player.seekTo((locationX / trackWidth) * duration);
    } catch {
      return;
    }
  };

  return (
    <View
      className={`mb-1 flex-row items-center gap-2 rounded-lg px-3 py-2 ${palette.container}`}
    >
      <IconButton
        icon={status.playing ? 'pause' : 'play'}
        size={20}
        iconColor={accentColor}
        onPress={togglePlayback}
        accessibilityLabel={`Reproducir audio: ${attachment.nombre}`}
      />
      <View className="flex-1 gap-1">
        <Text
          className="text-xs"
          style={{ color: accentColor }}
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
            className={`h-1.5 overflow-hidden rounded-full ${palette.track}`}
          >
            <View
              className={`h-full rounded-full ${palette.fill}`}
              style={{ width: `${progress}%` }}
            />
          </View>
        </Pressable>
        <Text className="text-xs" style={{ color: accentColor }}>
          {formatAudioTime(status.currentTime)} /{' '}
          {formatAudioTime(status.duration)}
        </Text>
      </View>
      <IconButton
        icon="download"
        size={20}
        iconColor={accentColor}
        onPress={() => void downloadAttachment(attachment)}
        accessibilityLabel={`Descargar audio: ${attachment.nombre}`}
      />
    </View>
  );
}

const AudioPlayer = React.memo(
  AudioPlayerInner,
  (prev, next) =>
    prev.attachment.id === next.attachment.id && prev.isOwn === next.isOwn,
);

function InlineVideo({
  uri,
  posterUri,
  autoplay,
  accentColor,
  attachment,
}: Readonly<{
  uri: string;
  posterUri: string | null;
  autoplay: boolean;
  accentColor: string;
  attachment: Attachment;
}>) {
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [hasStarted, setHasStarted] = useState(autoplay);

  const isLoading = hasStarted && (isBuffering || duration === 0);

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    const track = data.videoTracks[0];
    console.log(
      '[video-diag]',
      JSON.stringify({
        codecs: track?.codecs,
        width: data.naturalSize.width,
        height: data.naturalSize.height,
      }),
    );
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const handleBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const togglePlayback = () => {
    if (hasError) return;
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    } else if (hasStarted) {
      if (duration > 0 && currentTime >= duration - 0.1) {
        videoRef.current?.seek(0);
      }
      videoRef.current?.resume();
      setIsPlaying(true);
    } else {
      setHasStarted(true);
      setIsPlaying(true);
    }
  };

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const seekTo = (locationX: number) => {
    if (duration <= 0 || trackWidth <= 0) return;
    videoRef.current?.seek((locationX / trackWidth) * duration);
  };

  return (
    <View className="mb-1 gap-1">
      <View className="h-48 w-48 overflow-hidden rounded-lg bg-black">
        {hasStarted ? (
          <>
            <Video
              ref={videoRef}
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              {...(posterUri ? { poster: { source: { uri: posterUri } } } : {})}
              resizeMode="contain"
              viewType={ViewType.TEXTURE}
              controls={false}
              paused={!isPlaying}
              progressUpdateInterval={250}
              onLoadStart={() => setHasError(false)}
              onLoad={handleLoad}
              onProgress={handleProgress}
              onBuffer={handleBuffer}
              onEnd={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
            />
            {isLoading ? (
              <View className="absolute inset-0 items-center justify-center">
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
            {hasError ? (
              <View className="absolute inset-0 items-center justify-center px-3">
                <Text className="text-center text-sm text-white">
                  No se pudo reproducir el video.
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {posterUri ? (
              <Image
                source={{ uri: posterUri }}
                className="h-48 w-48"
                resizeMode="cover"
                accessibilityLabel={attachment.nombre}
              />
            ) : null}
            <View className="absolute inset-0 items-center justify-center">
              <IconButton
                icon="play"
                size={48}
                iconColor="#ffffff"
                onPress={togglePlayback}
                accessibilityLabel={`Reproducir video: ${attachment.nombre}`}
              />
            </View>
          </>
        )}
      </View>
      <View className="flex-row items-center justify-end">
        <IconButton
          icon="download"
          size={20}
          iconColor={accentColor}
          onPress={() => void downloadAttachment(attachment)}
          accessibilityLabel={`Descargar video: ${attachment.nombre}`}
        />
      </View>
      {hasStarted ? (
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            size={20}
            iconColor={accentColor}
            disabled={isLoading || hasError}
            onPress={togglePlayback}
            accessibilityLabel={`Reproducir video: ${attachment.nombre}`}
          />
          <View className="flex-1 gap-1">
            <Pressable
              className="h-3 justify-center"
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onPress={(e) => seekTo(e.nativeEvent.locationX)}
              accessibilityRole="adjustable"
              accessibilityLabel={`Progreso de video: ${attachment.nombre}`}
            >
              <View className="h-1.5 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600">
                <View
                  className="h-full rounded-full bg-brand-green-forest"
                  style={{ width: `${progress}%` }}
                />
              </View>
            </Pressable>
            <Text className="text-xs" style={{ color: accentColor }}>
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function VideoPlayer({
  attachment,
  accentColor,
}: Readonly<{ attachment: Attachment; accentColor: string }>) {
  const remoteUri = useMemo(
    () => resolveMediaUri(attachment.archivo),
    [attachment.archivo],
  );
  const cacheFile = useMemo(
    () => new File(Paths.cache, `video_${attachment.id}.mp4`),
    [attachment.id],
  );
  const posterFile = useMemo(
    () => new File(Paths.cache, `poster_${attachment.id}.jpg`),
    [attachment.id],
  );
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (cacheFile.exists) {
      setLocalUri(cacheFile.uri);
    }
  }, [cacheFile]);

  useEffect(() => {
    if (!localUri) {
      setPosterUri(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        if (posterFile.exists) {
          if (!cancelled) setPosterUri(posterFile.uri);
          return;
        }
        const thumbnail = await getThumbnailAsync(localUri, {
          time: 0,
          quality: 0.5,
        });
        new File(thumbnail.uri).copy(posterFile);
        if (!cancelled) setPosterUri(posterFile.uri);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localUri, posterFile]);

  const downloadVideo = async (playAfter: boolean) => {
    setAutoplay(playAfter);
    setIsDownloading(true);
    try {
      const downloaded = await File.downloadFileAsync(remoteUri, cacheFile, {
        idempotent: true,
      });
      setLocalUri(downloaded.uri);
    } catch {
      Alert.alert(
        'No se pudo reproducir',
        'No se pudo descargar el video. Inténtalo de nuevo.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!localUri) {
    return (
      <View className="mb-1 gap-1">
        <View className="h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-black">
          {isDownloading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <IconButton
              icon="play"
              size={48}
              iconColor="#ffffff"
              disabled={isDownloading}
              onPress={() => void downloadVideo(true)}
              accessibilityLabel={`Reproducir video: ${attachment.nombre}`}
            />
          )}
        </View>
        <View className="flex-row items-center justify-end">
          <IconButton
            icon="download"
            size={20}
            iconColor={accentColor}
            disabled={isDownloading}
            onPress={() => void downloadAttachment(attachment)}
            accessibilityLabel={`Descargar video: ${attachment.nombre}`}
          />
        </View>
      </View>
    );
  }

  return (
    <InlineVideo
      uri={localUri}
      posterUri={posterUri}
      autoplay={autoplay}
      accentColor={accentColor}
      attachment={attachment}
    />
  );
}

function bubbleGradientFor(
  isOwn: boolean,
  isDark: boolean,
): readonly [string, string] {
  if (isOwn) {
    return isDark
      ? [colors.admSurfaceD, mixHex(colors.admSurfaceD, colors.shadow, 0.12)]
      : [colors.surface, mixHex(colors.surface, colors.shadow, 0.05)];
  }
  return isDark
    ? [colors.admSurfaceD, mixHex(colors.admSurfaceD, colors.shadow, 0.08)]
    : [colors.surface, mixHex(colors.surface, colors.brandPrimary, 0.06)];
}

function renderAttachment(
  attachment: Attachment,
  isOwn: boolean,
  accentColor: string,
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
              iconColor={accentColor}
              onPress={() => void downloadAttachment(attachment)}
              accessibilityLabel={`Descargar imagen: ${attachment.nombre}`}
            />
          </View>
        </View>
      );
    case ATTACHMENT_TYPES.VIDEO:
      return <VideoPlayer attachment={attachment} accentColor={accentColor} />;
    case ATTACHMENT_TYPES.AUDIO:
      return <AudioPlayer attachment={attachment} isOwn={isOwn} />;
    default:
      return (
        <Text className="text-xs italic" style={{ color: accentColor }}>
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
  const isDark = colorScheme === 'dark';
  const theme = themeColors(isDark);
  const ownTextColor = isDark ? colors.iconWhite : theme.fg;
  const accentColor = isOwn ? ownTextColor : theme.muted;
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const { canEdit, canDelete } = useCanModifyMessage(message);

  const bubbleGradient = bubbleGradientFor(isOwn, isDark);

  const bubbleStyle = {
    borderWidth: 2,
    borderColor: isDark
      ? colors.admBorderD
      : mixHex(colors.admBorderL, colors.shadow, 0.2),
    ...(isDark
      ? {}
      : {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
        }),
  };

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
    <>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <View
            className={`mb-2 max-w-[80%] overflow-hidden rounded-2xl px-4 py-2 ${
              isOwn ? 'self-end rounded-br-md' : 'self-start rounded-bl-md'
            }`}
            style={bubbleStyle}
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
                <Text
                  className="mb-1 text-xs font-semibold"
                  style={{ color: theme.muted }}
                >
                  {message.remitente_nombre}
                </Text>
              )}

              {message.adjuntos?.map((att) => (
                <React.Fragment key={att.id}>
                  {renderAttachment(att, isOwn, accentColor, (uri) =>
                    setSelectedImageUri(uri),
                  )}
                </React.Fragment>
              ))}

              {message.contenido ? (
                <Text
                  className="text-base"
                  style={{ color: isOwn ? ownTextColor : theme.fg }}
                >
                  {message.contenido}
                </Text>
              ) : null}

              <Text
                className="mt-1 self-end text-xs"
                style={{ color: accentColor }}
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
              className={`${message.contenido ? 'h-[70%]' : 'h-[85%]'} w-full rounded-lg`}
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
