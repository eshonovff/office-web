import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSessionRejected, withCrossTabLock, withTransientRetry } from '~/lib/authFailure';

const unauthorized = { response: { status: 401 } };
const forbidden = { response: { status: 403 } };
const serverError = { response: { status: 502 } };
const networkError = new Error('Network Error'); // axios: no `response` at all

describe('isSessionRejected', () => {
  it('is true only for 401 and 403', () => {
    expect(isSessionRejected(unauthorized)).toBe(true);
    expect(isSessionRejected(forbidden)).toBe(true);
  });

  it('is false when the server was unreachable or failed', () => {
    expect(isSessionRejected(networkError)).toBe(false);
    expect(isSessionRejected(serverError)).toBe(false);
    expect(isSessionRejected(null)).toBe(false);
  });
});

describe('withTransientRetry', () => {
  it('retries while the server is unreachable, then returns the result', async () => {
    const fn = vi.fn().mockRejectedValueOnce(networkError).mockRejectedValueOnce(serverError).mockResolvedValue('ok');

    await expect(withTransientRetry(fn, 3, 0)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry a rejected session', async () => {
    const fn = vi.fn().mockRejectedValue(unauthorized);

    await expect(withTransientRetry(fn, 3, 0)).rejects.toBe(unauthorized);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last attempt with the last error', async () => {
    const fn = vi.fn().mockRejectedValue(networkError);

    await expect(withTransientRetry(fn, 3, 0)).rejects.toBe(networkError);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('withCrossTabLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs inside a named Web Lock when the browser has them', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<string>) => callback());
    vi.stubGlobal('navigator', { locks: { request } });

    await expect(withCrossTabLock('refresh', async () => 'token')).resolves.toBe('token');
    expect(request).toHaveBeenCalledWith('refresh', expect.any(Function));
  });

  it('just runs when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(withCrossTabLock('refresh', async () => 'token')).resolves.toBe('token');
  });
});
