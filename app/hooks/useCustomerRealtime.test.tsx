import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerChatKeys } from '~/api/customerChats';
import { customerCommentKeys } from '~/api/customerComments';
import { useSignalR } from '~/hooks/useSignalR';
import { useCustomerRealtime } from './useCustomerRealtime';

const invalidateQueries = vi.fn();

let hubState = {
  connection: { state: 'Connected' },
  reconnectCount: 0,
  start: vi.fn(),
  stop: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('~/hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}));

vi.mock('~/store/useCustomerHub', () => ({
  useCustomerHub: (selector?: (state: typeof hubState) => unknown) => (selector ? selector(hubState) : hubState),
}));

describe('useCustomerRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hubState = { connection: { state: 'Connected' }, reconnectCount: 0, start: vi.fn(), stop: vi.fn() };
  });

  it('re-reads comments (and only comments) when a post’s comments change', () => {
    renderHook(() => useCustomerRealtime());

    const handlers = vi.mocked(useSignalR).mock.calls.at(-1)?.[1];
    handlers?.CommentsUpdated({ channelId: 'ch1', mediaId: '1790001' });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: customerCommentKeys.all });
  });

  it('does not refetch on the first connect', () => {
    renderHook(() => useCustomerRealtime());
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('after a reconnect re-reads chats and comments, in case events were missed', () => {
    hubState = { ...hubState, reconnectCount: 1 };
    renderHook(() => useCustomerRealtime());

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: customerChatKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: customerCommentKeys.all });
  });
});
