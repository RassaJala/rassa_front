/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { Alert } from 'react-native';

import ChatBubble from '@/features/chat/components/ChatBubble';
import { ATTACHMENT_TYPES } from '@/types/chat';
import type { Message } from '@/types/chat';

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, nombre: 'Test User' },
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    themePreference: 'system',
    isLoaded: true,
    toggleColorScheme: jest.fn(),
    setThemePreference: jest.fn(),
  }),
}));

const imageMessage: Message = {
  id: 10,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 100,
      mensaje: 10,
      archivo: 'https://example.com/photo.jpg',
      tipo: ATTACHMENT_TYPES.IMAGEN,
      nombre: 'photo.jpg',
      tamaño: 1024000,
    },
  ],
};

const audioMessage: Message = {
  id: 11,
  conversacion: 1,
  remitente: 2,
  remitente_nombre: 'Other User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 101,
      mensaje: 11,
      archivo: 'https://example.com/voice.mp3',
      tipo: ATTACHMENT_TYPES.AUDIO,
      nombre: 'voice.mp3',
      tamaño: 512000,
    },
  ],
};

const videoMessage: Message = {
  id: 12,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 102,
      mensaje: 12,
      archivo: 'https://example.com/clip.mp4',
      tipo: ATTACHMENT_TYPES.VIDEO,
      nombre: 'clip.mp4',
      tamaño: 5120000,
    },
  ],
};

const textWithImageMessage: Message = {
  ...imageMessage,
  id: 13,
  contenido: 'Look at this!',
};

const { default: Video } = jest.requireMock('react-native-video') as {
  default: React.ComponentType<{
    source?: { uri?: string };
    paused?: boolean;
  }>;
};

describe('ChatBubble — media', () => {
  beforeEach(() => {
    const { __player } = jest.requireMock('react-native-video') as {
      __player: {
        seek: jest.Mock;
        resume: jest.Mock;
        pause: jest.Mock;
      };
    };
    const { File } = jest.requireMock('expo-file-system') as {
      File: { mockExists: boolean; downloadFileAsync: jest.Mock };
    };
    const { getThumbnailAsync } = jest.requireMock('expo-video-thumbnails') as {
      getThumbnailAsync: jest.Mock;
    };
    __player.seek.mockClear();
    __player.resume.mockClear();
    __player.pause.mockClear();
    File.downloadFileAsync.mockClear();
    File.mockExists = false;
    getThumbnailAsync.mockClear();
  });

  it('renders image attachment', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    expect(getByLabelText('photo.jpg')).toBeTruthy();
  });

  it('renders audio attachment with filename', () => {
    const { getByText } = render(
      <ChatBubble message={audioMessage} isOwn={false} />,
    );
    expect(getByText('voice.mp3')).toBeTruthy();
  });

  it('renders video attachment with download button', () => {
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    expect(getByLabelText('Descargar video: clip.mp4')).toBeTruthy();
  });

  it('downloads and plays video when the play button is pressed', async () => {
    const { File } = jest.requireMock('expo-file-system') as {
      File: { downloadFileAsync: jest.Mock };
    };
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    fireEvent.press(getByLabelText('Reproducir video: clip.mp4'));
    await waitFor(() =>
      expect(File.downloadFileAsync).toHaveBeenCalledWith(
        'https://example.com/clip.mp4',
        expect.anything(),
        { idempotent: true },
      ),
    );
    await waitFor(() => {
      const video = screen.UNSAFE_getByType(Video);
      expect(video.props.source?.uri).toBe('file:///cache/video_102.mp4');
      expect(video.props.paused).toBe(false);
    });
  });

  it('generates and caches a poster thumbnail after download', async () => {
    const { getThumbnailAsync } = jest.requireMock('expo-video-thumbnails') as {
      getThumbnailAsync: jest.Mock;
    };
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    fireEvent.press(getByLabelText('Reproducir video: clip.mp4'));
    await waitFor(() =>
      expect(getThumbnailAsync).toHaveBeenCalledWith(
        'file:///cache/video_102.mp4',
        expect.objectContaining({ time: 0 }),
      ),
    );
  });

  it('does not redownload a video that is already cached', async () => {
    const { File } = jest.requireMock('expo-file-system') as {
      File: { mockExists: boolean; downloadFileAsync: jest.Mock };
    };
    File.mockExists = true;
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    expect(screen.UNSAFE_queryByType(Video)).toBeNull();
    fireEvent.press(getByLabelText('Reproducir video: clip.mp4'));
    await waitFor(() => {
      const video = screen.UNSAFE_getByType(Video);
      expect(video.props.source?.uri).toBe('file:///cache/video_102.mp4');
      expect(video.props.paused).toBe(false);
    });
    expect(File.downloadFileAsync).not.toHaveBeenCalled();
  });

  it('shows a cached poster without regenerating the thumbnail', async () => {
    const { File } = jest.requireMock('expo-file-system') as {
      File: { mockExists: boolean };
    };
    const { getThumbnailAsync } = jest.requireMock('expo-video-thumbnails') as {
      getThumbnailAsync: jest.Mock;
    };
    File.mockExists = true;
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    expect(getByLabelText('clip.mp4')).toBeTruthy();
    expect(getByLabelText('Reproducir video: clip.mp4')).toBeTruthy();
    expect(getThumbnailAsync).not.toHaveBeenCalled();
  });

  it('shows an alert when the video download fails', async () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const { File } = jest.requireMock('expo-file-system') as {
      File: { downloadFileAsync: jest.Mock };
    };
    File.downloadFileAsync.mockRejectedValueOnce(new Error('network error'));
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    fireEvent.press(getByLabelText('Reproducir video: clip.mp4'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo reproducir',
        'No se pudo descargar el video. Inténtalo de nuevo.',
      ),
    );
    expect(screen.UNSAFE_queryByType(Video)).toBeNull();
    alertSpy.mockRestore();
  });

  it('renders image attachment with download button', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    expect(getByLabelText('Descargar imagen: photo.jpg')).toBeTruthy();
  });

  it('opens image modal when image is pressed', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    fireEvent.press(getByLabelText('Ampliar imagen: photo.jpg'));
    expect(getByLabelText('Imagen ampliada')).toBeTruthy();
  });

  it('shows message text below image in modal', () => {
    const { getByLabelText, getAllByText } = render(
      <ChatBubble message={textWithImageMessage} isOwn={true} />,
    );
    fireEvent.press(getByLabelText('Ampliar imagen: photo.jpg'));
    expect(getAllByText('Look at this!').length).toBeGreaterThanOrEqual(2);
  });

  it('renders audio attachment with download button', () => {
    const { getByLabelText } = render(
      <ChatBubble message={audioMessage} isOwn={false} />,
    );
    expect(getByLabelText('Descargar audio: voice.mp3')).toBeTruthy();
  });

  it('seeks audio when progress bar is pressed', () => {
    const { useAudioPlayer } = jest.requireMock('expo-audio') as {
      useAudioPlayer: jest.Mock;
    };
    const { getByLabelText } = render(
      <ChatBubble message={audioMessage} isOwn={false} />,
    );
    const bar = getByLabelText('Progreso de audio: voice.mp3');
    fireEvent(bar, 'layout', {
      nativeEvent: { layout: { width: 200, height: 12, x: 0, y: 0 } },
    });
    fireEvent(bar, 'press', { nativeEvent: { locationX: 100 } });
    const player = useAudioPlayer.mock.results.at(-1)?.value;
    expect(player.seekTo).toHaveBeenCalledWith(60);
  });

  it('restarts playback after the audio finished', () => {
    const { useAudioPlayer, useAudioPlayerStatus } = jest.requireMock(
      'expo-audio',
    ) as {
      useAudioPlayer: jest.Mock;
      useAudioPlayerStatus: jest.Mock;
    };
    const originalStatus = useAudioPlayerStatus.getMockImplementation();
    useAudioPlayerStatus.mockImplementation(() => ({
      playing: false,
      currentTime: 120,
      duration: 120,
      didJustFinish: true,
    }));
    try {
      const { getByLabelText } = render(
        <ChatBubble message={audioMessage} isOwn={false} />,
      );
      fireEvent.press(getByLabelText('Reproducir audio: voice.mp3'));
      const player = useAudioPlayer.mock.results.at(-1)?.value;
      expect(player.seekTo).toHaveBeenCalledWith(0);
      expect(player.play).toHaveBeenCalled();
    } finally {
      if (originalStatus) {
        useAudioPlayerStatus.mockImplementation(originalStatus);
      }
    }
  });

  it('renders message text below an audio attachment', () => {
    const audioWithTextMessage: Message = {
      ...audioMessage,
      contenido: 'Escucha esta nota',
    };
    const { getByText } = render(
      <ChatBubble message={audioWithTextMessage} isOwn={false} />,
    );
    expect(getByText('Escucha esta nota')).toBeTruthy();
  });

  it('renders text content alongside attachment', () => {
    const { getByText } = render(
      <ChatBubble message={textWithImageMessage} isOwn={true} />,
    );
    expect(getByText('Look at this!')).toBeTruthy();
  });

  it('renders empty content message without crashing', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    expect(getByLabelText('photo.jpg')).toBeTruthy();
  });
});
