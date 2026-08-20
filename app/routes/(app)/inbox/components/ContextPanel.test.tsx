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
    mediaLimits: [
      { category: 'image', maxSizeBytes: 5 * 1024 * 1024 },
      { category: 'audioVideo', maxSizeBytes: 16 * 1024 * 1024 },
      { category: 'document', maxSizeBytes: 100 * 1024 * 1024 },
    ],
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

  it('never shows the platform-scoped externalId for Instagram/Facebook — there is no separate username field to show it as', () => {
    renderPanel(makeConversation({ channelType: 'Instagram', externalId: 'ig_scoped_id_123', contactName: 'daler_ig' }));

    expect(screen.queryByText('ig_scoped_id_123')).not.toBeInTheDocument();
    expect(screen.queryByText('contactHandleLabel.Instagram:')).not.toBeInTheDocument();
  });

  it('shows the resolved contactName for Instagram/Facebook — it already falls back to the username server-side', () => {
    renderPanel(makeConversation({ channelType: 'Facebook', externalId: 'fb_psid_456', contactName: 'daler_fb' }));

    expect(screen.getByText('daler_fb')).toBeInTheDocument();
  });

  it('copies the phone number for WhatsApp', async () => {
    const user = userEvent.setup();
    renderPanel(makeConversation({ channelType: 'WhatsApp', externalId: '992509886588' }));

    await user.click(screen.getByTitle('copy'));

    await expect(navigator.clipboard.readText()).resolves.toBe('+992 50 988 65 88');
  });

  it('copies the resolved name/username for Instagram/Facebook, since there is nothing else to copy', async () => {
    const user = userEvent.setup();
    renderPanel(makeConversation({ channelType: 'Instagram', externalId: 'ig_scoped_id_123', contactName: 'daler_ig' }));

    await user.click(screen.getByTitle('copy'));

    await expect(navigator.clipboard.readText()).resolves.toBe('daler_ig');
  });

  it('falls back to externalId (with a copy button) when Instagram has not resolved a contact name yet', () => {
    renderPanel(makeConversation({ channelType: 'Instagram', externalId: 'ig_scoped_id_123', contactName: null }));

    expect(screen.getByText('ig_scoped_id_123')).toBeInTheDocument();
    expect(screen.getByTitle('copy')).toBeInTheDocument();
  });
});
