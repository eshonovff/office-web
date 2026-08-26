import { renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeConnection } from './useRealtimeConnection';

const start = vi.fn();
const stop = vi.fn();

const hubState = { start, stop };

vi.mock('~/store/useInboxHub', () => ({
  useInboxHub: (selector: (state: typeof hubState) => unknown) => selector(hubState),
}));

describe('useRealtimeConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts negotiation only once across the StrictMode setup-cleanup cycle', () => {
    vi.useFakeTimers();
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

    const { unmount } = renderHook(() => useRealtimeConnection(), { wrapper });

    expect(start).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(start).toHaveBeenCalledTimes(1);

    unmount();
    vi.useRealTimers();
  });

  it('stops the shared connection on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useRealtimeConnection());
    vi.runAllTimers();

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
