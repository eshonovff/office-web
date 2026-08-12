import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignalR } from '~/hooks/useSignalR';
import { useNotificationsRealtime } from './useNotificationsRealtime';

const invalidateQueries = vi.fn();
const setQueryData = vi.fn();

let hubState = {
  connection: { state: 'Connected' },
  reconnectCount: 0,
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData }),
}));

vi.mock('~/hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}));

vi.mock('~/store/useInboxHub', () => ({
  useInboxHub: (selector?: (state: typeof hubState) => unknown) => (selector ? selector(hubState) : hubState),
}));

describe('useNotificationsRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hubState = { connection: { state: 'Connected' }, reconnectCount: 0 };
  });

  it('does not refetch on initial mount (reconnectCount === 0)', () => {
    renderHook(() => useNotificationsRealtime());
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('refetches the notifications list after a reconnect', () => {
    renderHook(() => {
      hubState = { ...hubState, reconnectCount: 1 };
      return useNotificationsRealtime();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('prepends a realtime notification without duplicating an already-known id', () => {
    renderHook(() => useNotificationsRealtime());

    const handlers = vi.mocked(useSignalR).mock.calls.at(-1)?.[1];
    const notification = { id: 'n1', type: 'task_assigned', payloadJson: '{}', isRead: false, createdAt: '2026-08-12T00:00:00Z' };
    handlers?.NotificationReceived(notification);

    expect(setQueryData).toHaveBeenCalledWith(['notifications'], expect.any(Function));
    const updater = setQueryData.mock.calls[0][1] as (old: unknown[] | undefined) => unknown[];

    expect(updater(undefined)).toEqual([notification]);
    expect(updater([notification])).toEqual([notification]);
    expect(updater([{ ...notification, id: 'n0' }])).toEqual([notification, { ...notification, id: 'n0' }]);
  });
});
