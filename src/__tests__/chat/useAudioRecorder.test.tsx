/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React, { useEffect } from 'react';

import { act, render, waitFor } from '@testing-library/react-native';

import { useAudioRecorder } from '@/features/chat/hooks/useAudioRecorder';

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

let api: ReturnType<typeof useAudioRecorder> | null = null;

function Harness(): React.JSX.Element | null {
  const recorder = useAudioRecorder();
  useEffect(() => {
    api = recorder;
  }, [recorder]);
  return null;
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recorderInstances().length = 0;
    __testRequestPermissions.mockResolvedValue({ granted: true });
  });

  const getApi = async () => {
    render(<Harness />);
    await waitFor(() => expect(api).not.toBeNull());
    return api as ReturnType<typeof useAudioRecorder>;
  };

  it('requests permission and starts recording', async () => {
    const recorder = await getApi();
    await act(async () => {
      await recorder.startRecording();
    });
    const mockRecorder = recorderInstances()[0];
    expect(mockRecorder).toBeDefined();
    expect(__testRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockRecorder?.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecorder?.record).toHaveBeenCalled();
    expect(api?.isRecording).toBe(true);
  });

  it('returns a file when stopping', async () => {
    jest.useFakeTimers();
    const recorder = await getApi();
    await act(async () => {
      await recorder.startRecording();
    });
    jest.advanceTimersByTime(1200);
    const file = await act(async () => recorder.stopRecording());
    expect(file).not.toBeNull();
    expect(file?.uri).toBe('file:///audio.m4a');
    expect(file?.name).toMatch(/\.m4a$/);
    expect(file?.type).toBe('audio/mp4');
    expect(api?.isRecording).toBe(false);
    jest.useRealTimers();
  });

  it('discards the recording on cancel', async () => {
    const recorder = await getApi();
    await act(async () => {
      await recorder.startRecording();
    });
    await act(async () => {
      await recorder.cancelRecording();
    });
    const file = await act(async () => recorder.stopRecording());
    expect(file).toBeNull();
    expect(api?.isRecording).toBe(false);
  });

  it('sets an error when permission is denied', async () => {
    __testRequestPermissions.mockResolvedValueOnce({ granted: false });
    const recorder = await getApi();
    await act(async () => {
      await recorder.startRecording();
    });
    expect(api?.error).toContain('Permiso');
    expect(api?.isRecording).toBe(false);
    expect(recorderInstances()).toHaveLength(0);
  });
});
