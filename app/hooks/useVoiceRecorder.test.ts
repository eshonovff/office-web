import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickRecordingType, recordingFile, useVoiceRecorder } from './useVoiceRecorder';

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static supported: string[] = [];
  static isTypeSupported = (type: string) => FakeRecorder.supported.includes(type);
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options?: { mimeType?: string }
  ) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
    FakeRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;

function microphone(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(getUserMedia) },
    configurable: true,
  });
}

describe('pickRecordingType', () => {
  it('takes what each browser records best', () => {
    const only =
      (...types: string[]) =>
      (type: string) =>
        types.includes(type);
    expect(pickRecordingType(only('audio/webm;codecs=opus', 'audio/webm'))).toBe('audio/webm;codecs=opus'); // Chrome
    expect(pickRecordingType(only('audio/ogg;codecs=opus'))).toBe('audio/ogg;codecs=opus'); // Firefox
    expect(pickRecordingType(only('audio/mp4'))).toBe('audio/mp4'); // Safari, iPhone
    expect(pickRecordingType(only())).toBeUndefined();
  });
});

describe('recordingFile', () => {
  it('is named and typed as the server takes it', () => {
    const chrome = recordingFile(['x'], 'audio/webm;codecs=opus', 1);
    expect([chrome.type, chrome.name]).toEqual(['audio/webm', 'voice-note-1.webm']);
    const safari = recordingFile(['x'], 'audio/mp4', 1);
    expect([safari.type, safari.name]).toEqual(['audio/mp4', 'voice-note-1.mp4']);
    expect(recordingFile(['x'], '', 1).type).toBe('audio/webm');
  });
});

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    FakeRecorder.instances = [];
    FakeRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm'];
    track.stop.mockClear();
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    microphone(() => Promise.resolve(stream));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('records and hands over the file only when sent, freeing the microphone', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder(onRecorded));

    await act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    act(() => result.current.stop(true));

    expect(result.current.recording).toBe(false);
    expect(onRecorded).toHaveBeenCalledTimes(1);
    const file = onRecorded.mock.calls[0][0] as File;
    expect(file.type).toBe('audio/webm');
    expect(track.stop).toHaveBeenCalled();
  });

  it('records under StrictMode too (mounted, left and mounted again)', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder(onRecorded), { wrapper: StrictMode });

    await act(() => result.current.start());
    act(() => result.current.stop(true));

    expect(FakeRecorder.instances).toHaveLength(1);
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });

  it('throws a cancelled recording away', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder(onRecorded));

    await act(() => result.current.start());
    act(() => result.current.stop(false));

    expect(onRecorded).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });

  it('records on an iPhone (Safari: AAC in MP4)', async () => {
    FakeRecorder.supported = ['audio/mp4'];
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder(onRecorded));

    await act(() => result.current.start());
    act(() => result.current.stop(true));

    expect(FakeRecorder.instances[0].options?.mimeType).toBe('audio/mp4');
    expect((onRecorded.mock.calls[0][0] as File).name).toMatch(/\.mp4$/);
  });

  it('starts one recording from a quick double tap', async () => {
    let allow: (s: MediaStream) => void = () => undefined;
    microphone(() => new Promise((resolve) => (allow = resolve)));
    const { result } = renderHook(() => useVoiceRecorder(vi.fn()));

    await act(async () => {
      const first = result.current.start();
      const second = result.current.start();
      allow(stream);
      await Promise.all([first, second]);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(FakeRecorder.instances).toHaveLength(1);
  });

  it('says so when the microphone is not allowed', async () => {
    microphone(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    const { result } = renderHook(() => useVoiceRecorder(vi.fn()));

    await act(() => result.current.start());

    expect(result.current.error).toBe('permission');
    expect(result.current.recording).toBe(false);
  });

  it('says so when the browser cannot record', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const { result } = renderHook(() => useVoiceRecorder(vi.fn()));

    await act(() => result.current.start());

    expect(result.current.error).toBe('unsupported');
  });

  it('leaving the page while the browser asks for the microphone gives it straight back', async () => {
    let allow: (s: MediaStream) => void = () => undefined;
    microphone(() => new Promise((resolve) => (allow = resolve)));
    const onRecorded = vi.fn();
    const { result, unmount } = renderHook(() => useVoiceRecorder(onRecorded));
    let starting: Promise<void> = Promise.resolve();
    act(() => {
      starting = result.current.start();
    });

    unmount();
    await act(async () => {
      allow(stream);
      await starting;
    });

    expect(track.stop).toHaveBeenCalled();
    expect(FakeRecorder.instances).toHaveLength(0);
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('leaving the page throws the recording away and frees the microphone', async () => {
    const onRecorded = vi.fn();
    const { result, unmount } = renderHook(() => useVoiceRecorder(onRecorded));
    await act(() => result.current.start());

    unmount();

    expect(onRecorded).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
});
