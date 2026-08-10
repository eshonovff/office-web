import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignalR } from '~/hooks/useSignalR';
import { useInboxRealtime } from './useInboxRealtime';

const invalidateQueries = vi.fn();
const setQueryData = vi.fn();
const start = vi.fn();
const stop = vi.fn();
const invoke = vi.fn();
const setError = vi.fn();

let hubState = {
  connection: { state: 'Connected', invoke },
  status: 'connected',
  reconnectCount: 0,
  setError,
  start,
  stop,
};

vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Connected: 'Connected' },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData }),
}));

vi.mock('~/hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}));

vi.mock('~/store/useInboxHub', () => ({
  useInboxHub: (selector?: (state: typeof hubState) => unknown) => (selector ? selector(hubState) : hubState),
}));

describe('useInboxRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hubState = {
      connection: { state: 'Connected', invoke },
      status: 'connected',
      reconnectCount: 0,
      setError,
      start,
      stop,
    };
    invoke.mockResolvedValue(undefined);
  });

  it('joins channel groups again when reconnectCount changes', () => {
    const { rerender } = renderHook(
      ({ reconnectCount }) => {
        hubState = { ...hubState, reconnectCount };
        return useInboxRealtime(['channel-1', 'channel-2'], 'conversation-1');
      },
      { initialProps: { reconnectCount: 0 } }
    );

    expect(invoke).toHaveBeenCalledTimes(2);

    rerender({ reconnectCount: 1 });

    expect(invoke).toHaveBeenCalledTimes(4);
    expect(invoke).toHaveBeenLastCalledWith('JoinChannel', 'channel-2');
  });

  it('refetches conversations and the open thread after reconnect', () => {
    renderHook(() => {
      hubState = { ...hubState, reconnectCount: 1 };
      return useInboxRealtime(['channel-1'], 'conversation-1');
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['conversations'], exact: false });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['conversations', 'conversation-1', 'messages'] });
  });

  it('surfaces JoinChannel failures through the hub store', async () => {
    invoke.mockRejectedValue(new Error('join failed'));

    renderHook(() => useInboxRealtime(['channel-1'], null));
    await vi.waitFor(() => expect(setError).toHaveBeenCalledWith('joinChannelFailed'));
  });

  it('appends the full MessageDto from realtime without normalizing it', () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      direction: 'inbound',
      type: 'image',
      body: null,
      mediaUrl: '/api/messages/message-1/media',
      thumbnailUrl: '/api/messages/message-1/thumbnail',
      externalId: 'wa-message-1',
      deliveryStatus: 'delivered',
      isInternalNote: true,
      sentByUserId: 'user-1',
      sentByUserName: 'Sender',
      createdAt: '2026-08-10T12:00:00Z',
      mimeType: 'image/png',
      sizeBytes: 1024,
      originalFileName: 'photo.png',
      voiceDurationSeconds: null,
      mediaDeletedAt: null,
      mediaDownloadError: null,
    };

    renderHook(() => useInboxRealtime(['channel-1'], 'conversation-1'));

    const handlers = vi.mocked(useSignalR).mock.calls.at(-1)?.[1];
    handlers?.MessageReceived(message);

    expect(setQueryData).toHaveBeenCalledWith(['conversations', 'conversation-1', 'messages'], expect.any(Function));
    const updater = setQueryData.mock.calls[0][1] as (cache: {
      pages: Array<{ items: unknown[]; totalCount: number; page: number; pageSize: number }>;
      pageParams: unknown[];
    }) => unknown;
    const updated = updater({
      pages: [{ items: [], totalCount: 0, page: 1, pageSize: 30 }],
      pageParams: [1],
    });

    expect(updated).toMatchObject({
      pages: [{ items: [message], totalCount: 1, page: 1, pageSize: 30 }],
      pageParams: [1],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['conversations'], exact: false });
  });
});
