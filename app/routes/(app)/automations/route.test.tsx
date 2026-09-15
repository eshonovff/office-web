import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { automationsApi } from '~/api/automations';
import { channelsApi } from '~/api/channels';
import { commentAutomationApi } from '~/api/commentAutomation';
import { flowsApi } from '~/api/flows';
import { makeQueryClient } from '~/lib/query-client';
import type { AutomationListItem } from '~/types/automation';
import type { ChannelListItem } from '~/types/channel';
import AutomationsPage from './route';

vi.mock('~/api/channels', () => ({
  channelsApi: { list: vi.fn() },
}));

vi.mock('~/api/automations', () => ({
  automationsApi: { list: vi.fn() },
}));

vi.mock('~/api/commentAutomation', () => ({
  commentAutomationApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    dryRun: vi.fn(),
    listInstagramMedia: vi.fn(),
  },
}));

vi.mock('~/api/flows', () => ({
  flowsApi: { setActive: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeChannel(overrides: Partial<ChannelListItem> = {}): ChannelListItem {
  return {
    id: 'ig1',
    type: 'Instagram',
    name: 'My Instagram',
    externalId: '17841437397996064',
    isActive: true,
    createdAt: new Date().toISOString(),
    requiresReconnect: false,
    webhookSetupWarning: null,
    credentialsExpiresAt: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<AutomationListItem> = {}): AutomationListItem {
  return {
    id: 'a1',
    type: 'simple',
    name: 'Price question',
    isActive: true,
    channelId: 'ig1',
    channelName: 'My Instagram',
    contactCount: 3,
    conversionPercent: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage(initialPath = '/automations') {
  const queryClient = makeQueryClient();
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <AutomationsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AutomationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commentAutomationApi.list).mockResolvedValue([]);
  });

  it('shows an empty state when no Instagram channel is connected', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('noInstagramChannel')).toBeInTheDocument());
  });

  it('lists both simple and flow items with their type-appropriate action', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(automationsApi.list).mockResolvedValue([
      makeItem({ id: 'a1', type: 'simple', name: 'Price question' }),
      makeItem({ id: 'f1', type: 'flow', name: 'Lead magnet', conversionPercent: 42 }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Price question')).toBeInTheDocument());
    expect(screen.getByText('Lead magnet')).toBeInTheDocument();
    // simple → edit action; flow → open-canvas action.
    expect(screen.getByText('actions.edit')).toBeInTheDocument();
    expect(screen.getByText('openCanvas')).toBeInTheDocument();
  });

  it('shows "enable" instead of "disable" for an inactive item', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(automationsApi.list).mockResolvedValue([makeItem({ isActive: false })]);
    renderPage();

    await waitFor(() => expect(screen.getByText('enable')).toBeInTheDocument());
    expect(screen.queryByText('disable')).not.toBeInTheDocument();
  });

  it('calls automation-rule setActive when disabling a simple item', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(automationsApi.list).mockResolvedValue([makeItem({ id: 'a1', type: 'simple' })]);
    vi.mocked(commentAutomationApi.setActive).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('disable'));
    await user.click(screen.getByText('disable'));

    await waitFor(() => expect(commentAutomationApi.setActive).toHaveBeenCalledWith('ig1', 'a1', false));
    expect(flowsApi.setActive).not.toHaveBeenCalled();
  });

  it('calls flow setActive (not automation-rule) when disabling a flow item', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(automationsApi.list).mockResolvedValue([makeItem({ id: 'f1', type: 'flow' })]);
    vi.mocked(flowsApi.setActive).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('disable'));
    await user.click(screen.getByText('disable'));

    await waitFor(() => expect(flowsApi.setActive).toHaveBeenCalledWith('f1', false));
    expect(commentAutomationApi.setActive).not.toHaveBeenCalled();
  });

  it('selects the channel named in ?channel= when several Instagram channels exist', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'ig1', name: 'First' }),
      makeChannel({ id: 'ig2', name: 'Second' }),
    ]);
    vi.mocked(automationsApi.list).mockResolvedValue([]);
    renderPage('/automations?channel=ig2');

    await waitFor(() => expect(automationsApi.list).toHaveBeenCalledWith(expect.objectContaining({ channelId: 'ig2' })));
  });

  it('shows both entry-point cards for creating a simple rule or a flow', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(automationsApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('byKeyword.title')).toBeInTheDocument());
    expect(screen.getByText('constructor.title')).toBeInTheDocument();
  });
});
