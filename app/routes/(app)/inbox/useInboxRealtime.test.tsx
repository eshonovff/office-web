import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInboxRealtime } from './useInboxRealtime';

const invalidateQueries = vi.fn();
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
  useQueryClient: () => ({ invalidateQueries }),
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
});
