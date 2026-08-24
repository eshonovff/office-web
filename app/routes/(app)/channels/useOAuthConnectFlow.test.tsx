import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { makeQueryClient } from '~/lib/query-client';
import type { ChannelListItem } from '~/types/channel';
import { OAuthPopupClosedError } from './oauthPopup';
import { useOAuthConnectFlow } from './useOAuthConnectFlow';

vi.mock('~/api/channels', () => ({
  channelsApi: { startOAuth: vi.fn(), connectOAuth: vi.fn() },
}));

const waitForOAuthPopupResult = vi.fn();
vi.mock('./oauthPopup', async () => {
  const actual = await vi.importActual<typeof import('./oauthPopup')>('./oauthPopup');
  return { ...actual, waitForOAuthPopupResult: (...args: unknown[]) => waitForOAuthPopupResult(...args) };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: (...args: unknown[]) => toastSuccess(...args) },
}));

function makeFakePopup() {
  return { closed: false, location: { href: '' }, close: vi.fn() };
}

function renderFlow(existingChannels: ChannelListItem[] = []) {
  const queryClient = makeQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useOAuthConnectFlow('Instagram', existingChannels), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
  return { result, invalidateQueries };
}

const windowOpen = vi.fn();

describe('useOAuthConnectFlow', () => {
  let popup: ReturnType<typeof makeFakePopup>;

  beforeEach(() => {
    vi.clearAllMocks();
    popup = makeFakePopup();
    windowOpen.mockReturnValue(popup as unknown as Window);
    vi.stubGlobal('open', windowOpen);
  });

  it('shows a popup-blocked toast and stays idle when window.open returns null', async () => {
    windowOpen.mockReturnValue(null);
    const { result } = renderFlow();

    await act(() => result.current.begin());

    expect(toastError).toHaveBeenCalledWith('oauthPopupBlocked');
    expect(result.current.phase).toBe('idle');
    expect(channelsApi.startOAuth).not.toHaveBeenCalled();
  });

  it('points the popup at the authorization URL and moves to the accounts phase on success', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockResolvedValue({
      connectionId: 'conn-1',
      accounts: [{ externalId: 'acc-1', name: 'My Account' }],
    });

    const { result } = renderFlow();
    await act(() => result.current.begin());

    expect(popup.location.href).toBe('https://meta.example/auth');
    expect(result.current.phase).toBe('accounts');
    expect(result.current.accounts).toEqual([{ externalId: 'acc-1', name: 'My Account' }]);
  });

  it('resets silently, without a toast, when the popup is closed before completing', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockRejectedValue(new OAuthPopupClosedError());

    const { result } = renderFlow();
    await act(() => result.current.begin());

    expect(result.current.phase).toBe('idle');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('surfaces the callback ProblemDetails detail/title when Meta or the state check fails', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockResolvedValue({ title: 'State-и нодуруст', detail: 'кӯҳна шудааст', status: 400 });

    const { result } = renderFlow();
    await act(() => result.current.begin());

    expect(toastError).toHaveBeenCalledWith('кӯҳна шудааст');
    expect(result.current.phase).toBe('idle');
  });

  it('leaves apiClient to toast a /start failure (e.g. 403 missing channels.manage) and resets', async () => {
    vi.mocked(channelsApi.startOAuth).mockRejectedValue(new Error('403'));

    const { result } = renderFlow();
    await act(() => result.current.begin());

    expect(toastError).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
  });

  it('flags an account whose externalId already belongs to an existing channel of this provider', async () => {
    const existing: ChannelListItem[] = [
      { id: 'ch1', type: 'Instagram', name: 'Old name', externalId: 'acc-1', isActive: true, createdAt: '2026-01-01', requiresReconnect: false, credentialsExpiresAt: null },
    ];
    const { result } = renderFlow(existing);

    expect(result.current.isAlreadyConnected('acc-1')).toBe(true);
    expect(result.current.isAlreadyConnected('acc-2')).toBe(false);
  });

  it('connects the selected account, invalidates channels, and reports "created" for a brand-new account', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockResolvedValue({
      connectionId: 'conn-1',
      accounts: [{ externalId: 'acc-1', name: 'My Account' }],
    });
    vi.mocked(channelsApi.connectOAuth).mockResolvedValue({
      id: 'ch1',
      type: 'Instagram',
      name: 'My Account',
      externalId: 'acc-1',
      isActive: true,
      createdAt: '2026-01-01',
      requiresReconnect: false,
      credentialsExpiresAt: null,
      members: [],
    });

    const { result, invalidateQueries } = renderFlow([]);
    await act(() => result.current.begin());
    act(() => result.current.selectAccount('acc-1'));

    await act(() => result.current.confirm());

    expect(channelsApi.connectOAuth).toHaveBeenCalledWith('Instagram', { connectionId: 'conn-1', externalId: 'acc-1', name: 'My Account' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['channels'] });
    expect(toastSuccess).toHaveBeenCalledWith('channelCreated');
    expect(result.current.phase).toBe('idle');
  });

  it('reports "updated" instead of "created" when the picked account already maps to an existing channel', async () => {
    const existing: ChannelListItem[] = [
      { id: 'ch1', type: 'Instagram', name: 'Old name', externalId: 'acc-1', isActive: true, createdAt: '2026-01-01', requiresReconnect: false, credentialsExpiresAt: null },
    ];
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockResolvedValue({
      connectionId: 'conn-1',
      accounts: [{ externalId: 'acc-1', name: 'My Account' }],
    });
    vi.mocked(channelsApi.connectOAuth).mockResolvedValue({
      id: 'ch1',
      type: 'Instagram',
      name: 'My Account',
      externalId: 'acc-1',
      isActive: true,
      createdAt: '2026-01-01',
      requiresReconnect: false,
      credentialsExpiresAt: null,
      members: [],
    });

    const { result } = renderFlow(existing);
    await act(() => result.current.begin());
    act(() => result.current.selectAccount('acc-1'));
    await act(() => result.current.confirm());

    expect(toastSuccess).toHaveBeenCalledWith('channelUpdated');
  });

  it('drops back to the accounts phase (not idle) when confirm fails, so the user can retry without redoing OAuth', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockResolvedValue({
      connectionId: 'conn-1',
      accounts: [{ externalId: 'acc-1', name: 'My Account' }],
    });
    vi.mocked(channelsApi.connectOAuth).mockRejectedValue(new Error('400'));

    const { result } = renderFlow();
    await act(() => result.current.begin());
    act(() => result.current.selectAccount('acc-1'));
    await act(() => result.current.confirm());

    expect(result.current.phase).toBe('accounts');
    expect(result.current.accounts).toHaveLength(1);
  });

  it('closes the popup and resets when cancelled mid-wait', async () => {
    vi.mocked(channelsApi.startOAuth).mockResolvedValue({ url: 'https://meta.example/auth' });
    waitForOAuthPopupResult.mockReturnValue(new Promise(() => undefined));

    const { result } = renderFlow();
    act(() => {
      void result.current.begin();
    });
    await waitFor(() => expect(result.current.phase).toBe('waiting'));

    act(() => result.current.cancel());

    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
  });
});
