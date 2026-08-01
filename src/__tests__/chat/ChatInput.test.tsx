/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import ChatInput from '@/features/chat/components/ChatInput';

jest.mock('expo-audio', () => {
  const requestRecordingPermissionsAsync = jest.fn(async () => ({
    granted: true,
  }));
  const recordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  };
  class MockAudioRecorder {
    static instances: MockAudioRecorder[] = [];
    isRecording = false;
    uri: string | null = null;
    isReleased = false;
    prepareToRecordAsync = jest.fn(async () => undefined);
    record = jest.fn(() => {
      this.isRecording = true;
    });
    stop = jest.fn(async () => {
      this.isRecording = false;
      this.uri = 'file:///audio.m4a';
    });
    release = jest.fn(() => {
      this.isReleased = true;
    });
    constructor() {
      MockAudioRecorder.instances.push(this);
    }
  }
  return {
    AudioModule: { AudioRecorder: MockAudioRecorder },
    RecordingPresets: { HIGH_QUALITY: recordingOptions },
    requestRecordingPermissionsAsync,
    getRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setAudioModeAsync: jest.fn(async () => undefined),
    useAudioPlayer: jest.fn(),
    useAudioPlayerStatus: jest.fn(),
    __testRequestPermissions: requestRecordingPermissionsAsync,
  };
});

jest.mock('expo-audio/build/utils/options', () => ({
  createRecordingOptions: (options: unknown) => options,
}));

jest.mock('@/features/chat/components/AttachmentPicker', () => {
  const { Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const audioFile = {
    uri: 'file:///song.mp3',
    name: 'song.mp3',
    type: 'audio/mpeg',
    mimeType: 'audio/mpeg',
  };
  const MockPicker = ({
    onSelected,
    children,
  }: {
    onSelected: (file: typeof audioFile, kind: string) => void;
    children: React.ReactNode;
  }) => (
    <Pressable
      accessibilityLabel="mock-pick-audio"
      onPress={() => onSelected(audioFile, 'audio')}
    >
      {children}
    </Pressable>
  );
  return { __esModule: true, default: MockPicker };
});

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

type MockRecorder = {
  isRecording: boolean;
  uri: string | null;
  isReleased: boolean;
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  stop: jest.Mock;
  release: jest.Mock;
};

const { __testRequestPermissions } = jest.requireMock('expo-audio') as {
  __testRequestPermissions: jest.Mock;
};

const recorderInstances = () => {
  const audioModule = jest.requireMock('expo-audio') as {
    AudioModule: {
      AudioRecorder: { instances: MockRecorder[] };
    };
  };
  return audioModule.AudioModule.AudioRecorder.instances;
};

describe('ChatInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recorderInstances().length = 0;
    __testRequestPermissions.mockResolvedValue({ granted: true });
  });

  it('renders mic and file buttons when onSendMedia is provided', () => {
    render(<ChatInput onSend={jest.fn()} onSendMedia={jest.fn()} />);
    expect(screen.getByLabelText('Grabar audio')).toBeDefined();
    expect(screen.getByLabelText('Adjuntar archivo')).toBeDefined();
  });

  it('does not render mic button without onSendMedia', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.queryByLabelText('Grabar audio')).toBeNull();
  });

  it('sends recorded audio without text on stop', async () => {
    jest.useFakeTimers();
    const onSendMedia = jest.fn();
    render(<ChatInput onSend={jest.fn()} onSendMedia={onSendMedia} />);
    fireEvent.press(screen.getByLabelText('Grabar audio'));
    await act(async () => {});
    expect(screen.getByLabelText('Detener y enviar audio')).toBeDefined();
    jest.advanceTimersByTime(1200);
    fireEvent.press(screen.getByLabelText('Detener y enviar audio'));
    await act(async () => {});
    expect(onSendMedia).toHaveBeenCalledTimes(1);
    expect(onSendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///audio.m4a', type: 'audio/mp4' }),
      'audio',
    );
    jest.useRealTimers();
  });

  it('cancels recording without sending', async () => {
    const onSendMedia = jest.fn();
    render(<ChatInput onSend={jest.fn()} onSendMedia={onSendMedia} />);
    fireEvent.press(screen.getByLabelText('Grabar audio'));
    await waitFor(() =>
      expect(screen.getByLabelText('Cancelar grabación')).toBeDefined(),
    );
    fireEvent.press(screen.getByLabelText('Cancelar grabación'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Cancelar grabación')).toBeNull(),
    );
    expect(onSendMedia).not.toHaveBeenCalled();
  });

  it('shows an error when microphone permission is denied', async () => {
    __testRequestPermissions.mockResolvedValueOnce({ granted: false });
    render(<ChatInput onSend={jest.fn()} onSendMedia={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Grabar audio'));
    await waitFor(() =>
      expect(screen.getByText('Permiso de micrófono denegado.')).toBeDefined(),
    );
    expect(recorderInstances()).toHaveLength(0);
  });

  it('shows a pending attachment preview and sends it with text', async () => {
    const onSendMedia = jest.fn();
    render(<ChatInput onSend={jest.fn()} onSendMedia={onSendMedia} />);
    fireEvent.press(screen.getByLabelText('Adjuntar archivo'));
    await waitFor(() => expect(screen.getByText('song.mp3')).toBeDefined());

    fireEvent.changeText(
      screen.getByPlaceholderText('Escribe un mensaje...'),
      'hola',
    );
    fireEvent.press(screen.getByLabelText('Enviar mensaje'));
    await waitFor(() =>
      expect(onSendMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'file:///song.mp3',
          name: 'song.mp3',
        }),
        'audio',
        'hola',
      ),
    );
    expect(screen.queryByText('song.mp3')).toBeNull();
  });

  it('enables send with only a selected file and clears it after sending', async () => {
    const onSendMedia = jest.fn();
    render(<ChatInput onSend={jest.fn()} onSendMedia={onSendMedia} />);
    fireEvent.press(screen.getByLabelText('Adjuntar archivo'));
    await waitFor(() => expect(screen.getByText('song.mp3')).toBeDefined());

    fireEvent.press(screen.getByLabelText('Enviar mensaje'));
    await waitFor(() =>
      expect(onSendMedia).toHaveBeenCalledWith(
        expect.objectContaining({ uri: 'file:///song.mp3' }),
        'audio',
        undefined,
      ),
    );
    expect(screen.queryByText('song.mp3')).toBeNull();
  });

  it('removes a pending attachment without sending', async () => {
    const onSendMedia = jest.fn();
    render(<ChatInput onSend={jest.fn()} onSendMedia={onSendMedia} />);
    fireEvent.press(screen.getByLabelText('Adjuntar archivo'));
    await waitFor(() => expect(screen.getByText('song.mp3')).toBeDefined());

    fireEvent.press(screen.getByLabelText('Quitar archivo'));
    await waitFor(() => expect(screen.queryByText('song.mp3')).toBeNull());
    expect(onSendMedia).not.toHaveBeenCalled();
  });
});
