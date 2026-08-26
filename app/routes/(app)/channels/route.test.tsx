import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { makeQueryClient } from '~/lib/query-client';
import { useAuthStore } from '~/store/useAuthStore';
import type { ChannelListItem } from '~/types/channel';
import ChannelsPage from './route';

vi.mock('~/api/channels', () => ({
  channelsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    listWhatsAppTemplates: vi.fn(),
    startOAuth: vi.fn(),
    connectOAuth: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeChannel(overrides: Partial<ChannelListItem> = {}): ChannelListItem {
  return {
    id: 'ch1',
    type: 'WhatsApp',
    name: 'WhatsApp Test',
    externalId: '1206432455895142',
    isActive: true,
    createdAt: new Date().toISOString(),
    requiresReconnect: false,
    webhookSetupWarning: null,
    credentialsExpiresAt: null,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ChannelsPage />
    </QueryClientProvider>
  );
}

describe('ChannelsPage deactivate flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it('only shows the deactivate button for active channels', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'active', isActive: true }),
      makeChannel({ id: 'inactive', isActive: false }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getAllByText('deactivate')).toHaveLength(1));
  });

  it('asks for confirmation before calling deactivate', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('deactivate'));
    await user.click(screen.getByText('deactivate'));

    expect(screen.getByText('deactivateChannelTitle')).toBeInTheDocument();
    expect(channelsApi.deactivate).not.toHaveBeenCalled();
  });

  it('calls deactivate only after the confirmation is accepted', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(channelsApi.deactivate).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('deactivate'));
    await user.click(screen.getByText('deactivate'));
    // Confirm dialog re-uses the same "deactivate" label for its confirm button.
    const confirmButtons = screen.getAllByText('deactivate');
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(channelsApi.deactivate).toHaveBeenCalledWith('ch1'));
  });
});

describe('ChannelsPage WhatsApp test button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is hidden for a viewer without inbox.reply', async () => {
    useAuthStore.setState({ permissions: [] });
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    renderPage();

    await waitFor(() => screen.getByText('WhatsApp Test'));
    expect(screen.queryByText('testChannel')).not.toBeInTheDocument();
  });

  it('is hidden for non-WhatsApp channels even with inbox.reply', async () => {
    useAuthStore.setState({ permissions: ['inbox.reply'] });
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel({ type: 'Instagram' })]);
    renderPage();

    await waitFor(() => screen.getByText('WhatsApp Test'));
    expect(screen.queryByText('testChannel')).not.toBeInTheDocument();
  });

  it('shows a success toast when the templates call succeeds', async () => {
    useAuthStore.setState({ permissions: ['inbox.reply'] });
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(channelsApi.listWhatsAppTemplates).mockResolvedValue([
      { name: 'welcome', language: 'tg', status: 'APPROVED', bodyText: 'Салом!' },
    ]);
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('testChannel'));
    await user.click(screen.getByText('testChannel'));

    await waitFor(() => expect(channelsApi.listWhatsAppTemplates).toHaveBeenCalledWith('ch1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a failure toast, not a template count, when credentials are broken', async () => {
    useAuthStore.setState({ permissions: ['inbox.reply'] });
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(channelsApi.listWhatsAppTemplates).mockRejectedValue({ response: { status: 500 } });
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('testChannel'));
    await user.click(screen.getByText('testChannel'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('channelTestFailed', { id: 'channel-test' }));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('ChannelsPage OAuth connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn().mockReturnValue(null)); // popup-blocked path — simplest to assert against without a live popup
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always offers both provider connect buttons, alongside the manual-create flow', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByText('connectInstagram'));
    expect(screen.getByText('connectFacebook')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('starts the Instagram OAuth flow (blocked-popup path) when its button is clicked', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('connectInstagram'));
    await user.click(screen.getByText('connectInstagram'));

    expect(window.open).toHaveBeenCalledTimes(1);
    // Popup blocked -> never reaches /start.
    expect(channelsApi.startOAuth).not.toHaveBeenCalled();
  });

  it('offers "Пайваст аз нав" only on Instagram/Facebook channels, not WhatsApp', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'wa', type: 'WhatsApp' }),
      makeChannel({ id: 'ig', type: 'Instagram', externalId: 'ig1' }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getAllByText('reconnect')).toHaveLength(1));
  });

  it('reconnecting an Instagram channel drives the same Instagram flow as the page-level connect button', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel({ id: 'ig', type: 'Instagram', externalId: 'ig1' })]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('reconnect'));
    await user.click(screen.getByText('reconnect'));

    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('shows a "requires reconnect" badge when Meta rejected the stored token — used to be silent, only an owner notification', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'ig', type: 'Instagram', externalId: 'ig1', requiresReconnect: true }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getByText('requiresReconnect')).toBeInTheDocument());
  });

  it('does not show the badge for a channel whose credentials are still good', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel({ id: 'ig', type: 'Instagram', externalId: 'ig1' })]);
    renderPage();

    await waitFor(() => screen.getByText('reconnect'));
    expect(screen.queryByText('requiresReconnect')).not.toBeInTheDocument();
  });

  it('shows a "setup incomplete" badge and the reason when the webhook subscription check failed — not silent', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({
        id: 'fb',
        type: 'Facebook',
        externalId: 'fb1',
        webhookSetupWarning: 'Ин майдонҳо фаъол нестанд — сатҳи App Dashboard: messages. Паёмҳо намерасанд.',
      }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getByText('webhookSetupWarning')).toBeInTheDocument());
    expect(
      screen.getByText('Ин майдонҳо фаъол нестанд — сатҳи App Dashboard: messages. Паёмҳо намерасанд.')
    ).toBeInTheDocument();
  });

  it('does not show the setup-incomplete badge once the subscription is confirmed', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel({ id: 'fb', type: 'Facebook', externalId: 'fb1' })]);
    renderPage();

    await waitFor(() => screen.getByText('reconnect'));
    expect(screen.queryByText('webhookSetupWarning')).not.toBeInTheDocument();
  });
});
