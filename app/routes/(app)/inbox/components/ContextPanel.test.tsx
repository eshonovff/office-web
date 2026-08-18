import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import type { ConversationDetail } from '~/types/conversation';
import { ContextPanel } from './ContextPanel';

vi.mock('~/api/conversations', () => ({
  conversationsApi: {
    listAssignmentHistory: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 10 }),
  },
}));

function makeConversation(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'WhatsApp',
    externalId: '992509886588',
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

function renderPanel(conversation: ConversationDetail) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ContextPanel conversation={conversation} onStatusChange={vi.fn()} isChangingStatus={false} />
    </QueryClientProvider>
  );
}

describe('ContextPanel contact handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 10 });
  });

  it('shows a WhatsApp externalId as a grouped phone number under a "phone" label', () => {
    renderPanel(makeConversation({ channelType: 'WhatsApp', externalId: '992509886588' }));

    expect(screen.getByText('contactHandleLabel.WhatsApp:')).toBeInTheDocument();
    expect(screen.getByText('+992 50 988 65 88')).toBeInTheDocument();
  });

  it('shows an Instagram externalId as-is, under a generic "ID" label — not as a phone', () => {
    renderPanel(makeConversation({ channelType: 'Instagram', externalId: 'ig_scoped_id_123' }));

    expect(screen.getByText('contactHandleLabel.Instagram:')).toBeInTheDocument();
    expect(screen.getByText('ig_scoped_id_123')).toBeInTheDocument();
  });

  it('shows a Facebook externalId as-is, under a generic "ID" label', () => {
    renderPanel(makeConversation({ channelType: 'Facebook', externalId: 'fb_psid_456' }));

    expect(screen.getByText('contactHandleLabel.Facebook:')).toBeInTheDocument();
    expect(screen.getByText('fb_psid_456')).toBeInTheDocument();
  });

  it('copies the displayed (formatted) value to the clipboard', async () => {
    const user = userEvent.setup();
    renderPanel(makeConversation({ channelType: 'WhatsApp', externalId: '992509886588' }));

    await user.click(screen.getByTitle('copy'));

    await expect(navigator.clipboard.readText()).resolves.toBe('+992 50 988 65 88');
  });
});
