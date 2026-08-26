import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshAccessToken = vi.fn();
const meMock = vi.fn();

vi.mock('~/lib/client', () => ({ refreshAccessToken }));
vi.mock('~/api/auth', () => ({ authApi: { me: meMock } }));
vi.mock('~/config/permissions', () => ({ canAccessRoute: () => true }));

function makeRequest(pathname: string) {
  return { request: new Request(`http://localhost${pathname}`) } as never;
}

describe('(app) layout clientLoader — auth bootstrap order', () => {
  beforeEach(async () => {
    vi.resetModules();
    refreshAccessToken.mockReset();
    meMock.mockReset();
    const { useAuthStore } = await import('~/store/useAuthStore');
    useAuthStore.getState().clear();
  });

  it('refreshes before calling /auth/me on a hard refresh with a live session (no token in memory)', async () => {
    const callOrder: string[] = [];
    refreshAccessToken.mockImplementation(async () => {
      callOrder.push('refresh');
      return 'new-token';
    });
    meMock.mockImplementation(async () => {
      callOrder.push('me');
      return { id: 'u1', fullName: 'Test', username: 'test', mustChangePassword: false, roles: [], permissions: [] };
    });

    const { clientLoader } = await import('./layout');
    const result = await clientLoader(makeRequest('/'));

    expect(callOrder).toEqual(['refresh', 'me']);
    expect(result).toEqual({ user: await meMock.mock.results[0]!.value });
  });

  it('quietly redirects to /login without ever calling /auth/me when the refresh cookie is dead', async () => {
    refreshAccessToken.mockRejectedValue({ response: { status: 401 } });

    const { clientLoader } = await import('./layout');
    const result = await clientLoader(makeRequest('/'));

    expect(meMock).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get('Location')).toBe('/login');
  });

  it('skips the refresh call when a token is already in memory (SPA navigation, not a hard refresh)', async () => {
    const { useAuthStore } = await import('~/store/useAuthStore');
    useAuthStore.setState({ accessToken: 'already-have-one' });
    meMock.mockResolvedValue({ id: 'u1', fullName: 'Test', username: 'test', mustChangePassword: false, roles: [], permissions: [] });

    const { clientLoader } = await import('./layout');
    await clientLoader(makeRequest('/'));

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(meMock).toHaveBeenCalledTimes(1);
  });
});
