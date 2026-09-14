import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { commentAutomationApi } from '~/api/commentAutomation';
import { makeQueryClient } from '~/lib/query-client';
import type { ChannelListItem } from '~/types/channel';
import type { AutomationRuleListItem } from '~/types/commentAutomation';
import InstagramAutomationPage from './route';

vi.mock('~/api/channels', () => ({
  channelsApi: { list: vi.fn() },
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

function makeRule(overrides: Partial<AutomationRuleListItem> = {}): AutomationRuleListItem {
  return {
    id: 'rule1',
    name: 'Price question',
    isActive: true,
    triggerType: 'instagram_comment',
    triggerConfig: { matchMode: 'keyword', keywords: ['нарх'], postScope: 'all', postIds: [] },
    actionConfig: { commentReplies: ['Ташаккур!'], dmText: 'Салом дар DM', dmButtonUrl: null, dmButtonTitle: null },
    cooldownMinutes: 60,
    createdAt: new Date().toISOString(),
    runCount: 3,
    ...overrides,
  };
}

function renderPage(initialPath = '/instagram-automation') {
  const queryClient = makeQueryClient();
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <InstagramAutomationPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('InstagramAutomationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when no Instagram channel is connected', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('noInstagramChannel')).toBeInTheDocument());
  });

  it('lists rules with their run count and Edit/Disable actions', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(commentAutomationApi.list).mockResolvedValue([makeRule()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Price question')).toBeInTheDocument());
    expect(screen.getByText('actions.edit')).toBeInTheDocument();
    expect(screen.getByText('disable')).toBeInTheDocument();
  });

  it('shows "enable" instead of "disable" for an inactive rule', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(commentAutomationApi.list).mockResolvedValue([makeRule({ isActive: false })]);
    renderPage();

    await waitFor(() => expect(screen.getByText('enable')).toBeInTheDocument());
    expect(screen.queryByText('disable')).not.toBeInTheDocument();
  });

  it('calls setActive when the disable button is clicked', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(commentAutomationApi.list).mockResolvedValue([makeRule()]);
    vi.mocked(commentAutomationApi.setActive).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('disable'));
    await user.click(screen.getByText('disable'));

    await waitFor(() => expect(commentAutomationApi.setActive).toHaveBeenCalledWith('ig1', 'rule1', false));
  });

  it('selects the channel named in ?channel= when several Instagram channels exist', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'ig1', name: 'First' }),
      makeChannel({ id: 'ig2', name: 'Second' }),
    ]);
    vi.mocked(commentAutomationApi.list).mockResolvedValue([]);
    renderPage('/instagram-automation?channel=ig2');

    await waitFor(() => expect(commentAutomationApi.list).toHaveBeenCalledWith('ig2'));
  });
});
