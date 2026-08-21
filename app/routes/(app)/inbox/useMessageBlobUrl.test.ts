import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { revokeMessageBlobCache, useMessageBlobUrl } from './useMessageBlobUrl';

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
