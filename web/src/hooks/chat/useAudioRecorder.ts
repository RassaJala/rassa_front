import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const pendingStopRef = useRef<((file: File | null) => void) | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined';

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (shouldSend: boolean) => {
      const recorder = mediaRecorderRef.current;
      const stream = streamRef.current;
      clearTimer();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      setElapsed(0);
      setIsRecording(false);
      const resolve = pendingStopRef.current;
      pendingStopRef.current = null;
      if (!resolve) return;
      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (!shouldSend || !recorder || chunks.length === 0) {
        resolve(null);
        return;
      }
      const type = recorder.mimeType || 'audio/webm';
      resolve(
        new File([new Blob(chunks, { type })], `grabacion-${Date.now()}.webm`, {
          type,
        }),
      );
    },
    [clearTimer],
  );

  const startRecording = useCallback(async () => {
    if (!isSupported || isRecording) return;
    setError(null);
    setElapsed(0);
    discardedRef.current = false;
    chunksRef.current = [];
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const denied =
        err instanceof DOMException && err.name === 'NotAllowedError';
      setError(
        denied
          ? 'Permiso de micrófono denegado.'
          : 'No se pudo acceder al micrófono.',
      );
      return;
    }
    const supportsWebm =
      typeof MediaRecorder.isTypeSupported === 'function' &&
      MediaRecorder.isTypeSupported('audio/webm');
    const recorder = new MediaRecorder(
      stream,
      supportsWebm ? { mimeType: 'audio/webm' } : undefined,
    );
    streamRef.current = stream;
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      finish(!discardedRef.current);
    };
    recorder.start();
    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }, [isSupported, isRecording, finish]);

  const stopRecording = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      pendingStopRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    discardedRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }
    finish(false);
  }, [finish]);

  useEffect(() => {
    return () => {
      clearTimer();
      discardedRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
    };
  }, [clearTimer]);

  return {
    isSupported,
    isRecording,
    elapsed,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
