import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '~/store/useAuthStore';

const refreshAccessToken = vi.fn();

vi.mock('~/lib/client', () => ({
  refreshAccessToken: () => refreshAccessToken(),
}));

function makeToken(expSecondsFromNow: number) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.sig`;
}

describe('getHubAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('returns the in-memory token when it is not near expiry', async () => {
    const token = makeToken(300);
    useAuthStore.setState({ accessToken: token });
    const { getHubAccessToken } = await import('~/lib/signalr');

    await expect(getHubAccessToken()).resolves.toBe(token);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes the token when it is expired', async () => {
    useAuthStore.setState({ accessToken: makeToken(-1) });
    refreshAccessToken.mockResolvedValue('fresh-token');
    const { getHubAccessToken } = await import('~/lib/signalr');

    await expect(getHubAccessToken()).resolves.toBe('fresh-token');
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
