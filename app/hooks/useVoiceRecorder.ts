import { useEffect, useRef, useState } from 'react';

// What each browser records in, best first: Chrome and Edge WebM/Opus, Firefox Ogg/Opus, Safari
// (iPhone included) AAC in MP4. The server takes exactly these (VoiceNoteTypes) and makes AAC.
const RECORDING_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const EXTENSIONS: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'mp4' };

export type VoiceRecorderError = 'unsupported' | 'permission';

/** The first type this browser can record; undefined — let it choose. */
export function pickRecordingType(isSupported: (type: string) => boolean): string | undefined {
  return RECORDING_TYPES.find((type) => isSupported(type));
}

/** The recording as a file the server takes: its type without codecs, named by it. */
export function recordingFile(chunks: BlobPart[], recordedType: string, now = Date.now()): File {
  const type = (recordedType.split(';')[0] || 'audio/webm').trim().toLowerCase();
  const extension = EXTENSIONS[type] ?? 'webm';
  return new File(chunks, `voice-note-${now}.${extension}`, { type });
}

/**
 * Records a voice note from the microphone. `stop(true)` hands the file to `onRecorded`,
 * `stop(false)` throws it away; leaving the page throws it away too and frees the microphone.
 */
export function useVoiceRecorder(onRecorded: (file: File) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sendRef = useRef(false);
  // getUserMedia waits for the permission prompt — a second tap must not start a second recording.
  const startingRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  const leftRef = useRef(false);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  const release = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Set again on every mount: StrictMode mounts, leaves and mounts once more.
  useEffect(() => {
    leftRef.current = false;
    return () => {
      leftRef.current = true;
      sendRef.current = false;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      release();
    };
  }, []);

  async function start() {
    if (startingRef.current || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('unsupported');
      return;
    }

    startingRef.current = true;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The page was left while the browser asked for the microphone — give it straight back.
      if (leftRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const type = pickRecordingType((t) => MediaRecorder.isTypeSupported?.(t) ?? false);
      const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      sendRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        release();
        setRecording(false);
        if (!sendRef.current || chunksRef.current.length === 0) return;
        onRecordedRef.current(recordingFile(chunksRef.current, recorder.mimeType || type || 'audio/webm'));
      };

      recorder.start();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    } catch {
      release();
      setError('permission');
    } finally {
      startingRef.current = false;
    }
  }

  function stop(send: boolean) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    sendRef.current = send;
    recorder.stop();
  }

  return { recording, elapsed, error, start, stop, clearError: () => setError(null) };
}
