import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { revokeMessageBlobCache, useGatedMediaDownload, useMessageBlobUrl } from './useMessageBlobUrl';

vi.mock('~/api/conversations', () => ({
  conversationsApi: { getMediaBlob: vi.fn(), getThumbnailBlob: vi.fn() },
}));

URL.createObjectURL = vi.fn(() => 'blob:mock');
URL.revokeObjectURL = vi.fn();

describe('useMessageBlobUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeMessageBlobCache();
  });

  it('is idle when there is no path to fetch', () => {
    const { result } = renderHook(() => useMessageBlobUrl('media', 'm1', null));

    expect(result.current.status).toBe('idle');
    expect(result.current.objectUrl).toBeNull();
    expect(conversationsApi.getMediaBlob).not.toHaveBeenCalled();
  });

  it('goes loading -> ready once the blob resolves', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockResolvedValue(new Blob(['data']));
    const { result } = renderHook(() => useMessageBlobUrl('media', 'm1', '/api/messages/m1/media'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.objectUrl).toBe('blob:mock');
  });

  it('maps a 424 to download-error and a 410 to gone', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockRejectedValue({ response: { status: 424 } });
    const { result } = renderHook(() => useMessageBlobUrl('media', 'm1', '/api/messages/m1/media'));
    await waitFor(() => expect(result.current.status).toBe('download-error'));

    vi.mocked(conversationsApi.getMediaBlob).mockRejectedValue({ response: { status: 410 } });
    const { result: result2 } = renderHook(() => useMessageBlobUrl('media', 'm2', '/api/messages/m2/media'));
    await waitFor(() => expect(result2.current.status).toBe('gone'));
  });

  it('retry() re-fetches instead of replaying the cached error, and can recover', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockRejectedValueOnce({ response: { status: 500 } });
    const { result } = renderHook(() => useMessageBlobUrl('media', 'm1', '/api/messages/m1/media'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    vi.mocked(conversationsApi.getMediaBlob).mockResolvedValueOnce(new Blob(['data']));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(conversationsApi.getMediaBlob).toHaveBeenCalledTimes(2);
  });

  it('retry() on a permanent server failure just asks again — there is no re-enqueue endpoint, so it can legitimately get the same answer', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockRejectedValue({ response: { status: 424 } });
    const { result } = renderHook(() => useMessageBlobUrl('media', 'm1', '/api/messages/m1/media'));
    await waitFor(() => expect(result.current.status).toBe('download-error'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('download-error'));
    expect(conversationsApi.getMediaBlob).toHaveBeenCalledTimes(2);
  });
});

describe('useGatedMediaDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeMessageBlobCache();
  });

  it('never fetches on mount, even with a real path — that is the whole point of gating it', () => {
    const { result } = renderHook(() => useGatedMediaDownload('m1', '/api/messages/m1/media'));

    expect(result.current.status).toBe('idle');
    expect(conversationsApi.getMediaBlob).not.toHaveBeenCalled();
  });

  it('start() reports progress while in flight, then resolves to ready', async () => {
    let capturedProgress: ((event: { loaded: number; total?: number }) => void) | undefined;
    vi.mocked(conversationsApi.getMediaBlob).mockImplementation(async (_path, config) => {
      capturedProgress = config?.onDownloadProgress as typeof capturedProgress;
      capturedProgress?.({ loaded: 512, total: 2048 });
      return new Blob(['data']);
    });
    const { result } = renderHook(() => useGatedMediaDownload('m1', '/api/messages/m1/media'));

    act(() => result.current.start());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.objectUrl).toBe('blob:mock');
  });

  it('start() twice in a row only fetches once', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockResolvedValue(new Blob(['data']));
    const { result } = renderHook(() => useGatedMediaDownload('m1', '/api/messages/m1/media'));

    act(() => {
      result.current.start();
      result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(conversationsApi.getMediaBlob).toHaveBeenCalledTimes(1);
  });

  it('cancel() aborts the in-flight request and returns to idle, not an error state', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockImplementation(
      (_path, config) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('canceled'), { name: 'CanceledError' })));
        })
    );
    const { result } = renderHook(() => useGatedMediaDownload('m1', '/api/messages/m1/media'));

    act(() => result.current.start());
    expect(result.current.status).toBe('downloading');

    act(() => result.current.cancel());

    await waitFor(() => expect(result.current.status).toBe('idle'));
  });

  it('maps a 424 (permanent server-side failure) the same way the auto hook does', async () => {
    vi.mocked(conversationsApi.getMediaBlob).mockRejectedValue({ response: { status: 424 } });
    const { result } = renderHook(() => useGatedMediaDownload('m1', '/api/messages/m1/media'));

    act(() => result.current.start());

    await waitFor(() => expect(result.current.status).toBe('download-error'));
  });
});
