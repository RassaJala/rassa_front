import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder } from '../useAudioRecorder';

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(public stream: MediaStream) {}

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({
      data: new Blob(['chunk'], { type: 'audio/webm' }),
      type: 'dataavailable',
    } as BlobEvent);
    this.onstop?.();
  }
}

const makeStream = () =>
  ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;

const setupMedia = (getUserMediaImpl: () => Promise<MediaStream>) => {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  const getUserMedia = vi.fn(getUserMediaImpl);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
  return getUserMedia;
};

describe('useAudioRecorder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('is unsupported when MediaRecorder is not available', () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isSupported).toBe(false);
  });

  it('does not start recording when unsupported', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('requests microphone permission and starts recording', async () => {
    const getUserMedia = setupMedia(async () => makeStream());
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isRecording).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('produces an audio file on stop', async () => {
    setupMedia(async () => makeStream());
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    let file: File | null = null;
    await act(async () => {
      file = await result.current.stopRecording();
    });
    expect(file).not.toBeNull();
    expect(file?.type).toBe('audio/webm');
    expect(file?.name).toMatch(/^grabacion-.+\.webm$/);
    expect(result.current.isRecording).toBe(false);
  });

  it('discards the recording on cancel', async () => {
    setupMedia(async () => makeStream());
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.cancelRecording();
    });
    let file: File | null = null;
    await act(async () => {
      file = await result.current.stopRecording();
    });
    expect(file).toBeNull();
    expect(result.current.isRecording).toBe(false);
  });

  it('sets an error when microphone permission is denied', async () => {
    setupMedia(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.error).toContain('Permiso');
    expect(result.current.isRecording).toBe(false);
  });

  it('tracks elapsed seconds while recording', async () => {
    vi.useFakeTimers();
    setupMedia(async () => makeStream());
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.elapsed).toBe(2);
  });
});
