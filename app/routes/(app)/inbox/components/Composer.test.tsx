import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import { useAuthStore } from '~/store/useAuthStore';
import type { ConversationDetail } from '~/types/conversation';
import { Composer } from './Composer';

vi.mock('~/api/conversations', () => ({
  conversationsApi: { sendMessage: vi.fn() },
}));
vi.mock('~/api/channels', () => ({
  channelsApi: { listWhatsAppTemplates: vi.fn() },
}));

function makeConversation(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'Test WA',
    externalId: '992900000001',
    contactName: 'Далер',
    contactAvatarUrl: null,
    status: 'New',
    assignedTo: null,
    assignedToName: null,
    lastMessageAt: null,
    unreadCount: 0,
    windowExpiresAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderComposer(conversation: ConversationDetail) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Composer conversation={conversation} />
    </QueryClientProvider>
  );
}

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it('sends free text when the window is open', async () => {
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({} as any);
    const user = userEvent.setup();

    renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

    await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
    await user.click(screen.getByText('send'));

    await waitFor(() => {
      expect(conversationsApi.sendMessage).toHaveBeenCalledWith('c1', { body: 'Салом!' });
    });
  });

  it('blocks free text and asks a channels.manage holder to pick a template when the window is closed', async () => {
    useAuthStore.setState({ permissions: ['channels.manage'] });
    vi.mocked(channelsApi.listWhatsAppTemplates).mockResolvedValue([
      { name: 'welcome', language: 'tg', status: 'APPROVED', bodyText: 'Салом!' },
    ]);

    renderComposer(makeConversation({ windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('composerPlaceholder')).not.toBeInTheDocument();
    await waitFor(() => expect(channelsApi.listWhatsAppTemplates).toHaveBeenCalledWith('ch1'));
  });

  it('tells a user without channels.manage to ask an admin, without fetching templates', () => {
    renderComposer(makeConversation({ windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.getByText('templatesUnavailable')).toBeInTheDocument();
    expect(channelsApi.listWhatsAppTemplates).not.toHaveBeenCalled();
  });

  it('treats a missing windowExpiresAt as closed', () => {
    renderComposer(makeConversation({ windowExpiresAt: null }));
    expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();
  });

  it('switches to the template flow when send comes back with a 409 mid-send', async () => {
    vi.mocked(conversationsApi.sendMessage).mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();

    renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

    await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
    await user.click(screen.getByText('send'));

    await waitFor(() => expect(screen.getByText('windowClosedDuringSend')).toBeInTheDocument());
  });
});
