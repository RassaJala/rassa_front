import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import { createRecordingOptions } from 'expo-audio/build/utils/options';

export interface RecordedAudio {
  uri: string;
  name: string;
  type: string;
  mimeType: string;
}

export interface AudioRecorderApi {
  isRecording: boolean;
  elapsed: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordedAudio | null>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecorder(): AudioRecorderApi {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const disposedRef = useRef(false);

  const getRecorder = useCallback((): AudioRecorder => {
    recorderRef.current ??= new AudioModule.AudioRecorder(
      createRecordingOptions(RecordingPresets.HIGH_QUALITY),
    );
    return recorderRef.current;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      clearTimer();
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        try {
          recorder.release();
        } catch {
          // already released
        }
      }
    };
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Permiso de micrófono denegado.');
        return;
      }
      if (disposedRef.current) return;
      const recorder = getRecorder();
      if (recorder.isRecording) return;
      setError(null);
      setElapsed(0);
      cancelledRef.current = false;
      startTimeRef.current = null;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed((seconds) => seconds + 1);
      }, 1000);
    } catch {
      setError('No se pudo iniciar la grabación.');
    }
  }, [getRecorder]);

  const stopRecording = useCallback(async (): Promise<RecordedAudio | null> => {
    try {
      if (disposedRef.current) return null;
      const recorder = getRecorder();
      if (!recorder.isRecording) return null;
      await recorder.stop();
      clearTimer();
      setIsRecording(false);
      const recordedMillis =
        startTimeRef.current != null ? Date.now() - startTimeRef.current : 0;
      startTimeRef.current = null;
      if (cancelledRef.current || recordedMillis < 1000 || !recorder.uri) {
        return null;
      }
      return {
        uri: recorder.uri,
        name: `grabacion-${Date.now()}.m4a`,
        type: 'audio/mp4',
        mimeType: 'audio/mp4',
      };
    } catch {
      clearTimer();
      setIsRecording(false);
      setError('No se pudo detener la grabación.');
      return null;
    }
  }, [getRecorder, clearTimer]);

  const cancelRecording = useCallback(async () => {
    cancelledRef.current = true;
    try {
      const recorder = getRecorder();
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // ignore errors: the recorder may already be released
    }
    clearTimer();
    setIsRecording(false);
  }, [getRecorder, clearTimer]);

  return {
    isRecording,
    elapsed,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
