import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import { useAuthStore } from '~/store/useAuthStore';
import type { ConversationDetail } from '~/types/conversation';
import type { Message } from '~/types/message';
import { isScrolledNearBottom, MessageThread } from './MessageThread';

vi.mock('~/api/conversations', () => ({
  conversationsApi: {
    listMessages: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 30 }),
    markAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    direction: 'Inbound',
    type: 'Text',
    body: 'Салом',
    mediaUrl: null,
    externalId: 'ext-1',
    deliveryStatus: 'Delivered',
    isInternalNote: false,
    sentByUserId: null,
    sentByUserName: null,
    createdAt: new Date().toISOString(),
    mimeType: null,
    sizeBytes: null,
    originalFileName: null,
    voiceDurationSeconds: null,
    thumbnailUrl: null,
    mediaDeletedAt: null,
    mediaDownloadError: null,
    waveformPeaks: null,
    failureReason: null,
    externalContentUrl: null,
    externalContentKind: null,
    ...overrides,
  };
}

function makeConversation(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'Test WA',
    externalId: '992900000001',
    contactName: 'Далер',
    contactAvatarUrl: null,
    contactUsername: null,
    status: 'New',
    assignedTo: null,
    assignedToName: null,
    lastMessageAt: null,
    unreadCount: 0,
    windowExpiresAt: null,
    createdAt: new Date().toISOString(),
    mediaLimits: [],
    ...overrides,
  };
}

function renderThread(props: Partial<React.ComponentProps<typeof MessageThread>> = {}) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MessageThread conversationId="c1" conversation={makeConversation()} {...props} />
    </QueryClientProvider>
  );
}

describe('MessageThread header navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it('shows neither back nor info buttons on desktop (no handlers passed)', () => {
    renderThread();
    expect(screen.queryByLabelText('back')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('conversationInfo')).not.toBeInTheDocument();
  });

  it('shows a back button that calls onBack when tapped', async () => {
    const onBack = vi.fn();
    renderThread({ onBack });

    await userEvent.click(screen.getByLabelText('back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows an info button that calls onOpenInfo when tapped', async () => {
    const onOpenInfo = vi.fn();
    renderThread({ onOpenInfo });

    await userEvent.click(screen.getByLabelText('conversationInfo'));

    expect(onOpenInfo).toHaveBeenCalledTimes(1);
  });

  it('marks the conversation as read once per opened conversation', async () => {
    renderThread();
    await waitFor(() => expect(conversationsApi.markAsRead).toHaveBeenCalledWith('c1'));
    expect(conversationsApi.markAsRead).toHaveBeenCalledTimes(1);
  });
});

describe('isScrolledNearBottom', () => {
  it('is true once fully scrolled to the bottom', () => {
    expect(isScrolledNearBottom(1000, 700, 300)).toBe(true);
  });

  it('is true within the threshold of the bottom', () => {
    expect(isScrolledNearBottom(1000, 600, 300)).toBe(true);
  });

  it('is false when scrolled well above the bottom (e.g. reading history)', () => {
    expect(isScrolledNearBottom(1000, 200, 300)).toBe(false);
  });
});

describe('MessageThread auto-scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('scrolls to the bottom the first time a conversation with messages opens', async () => {
    vi.mocked(conversationsApi.listMessages).mockResolvedValue({
      items: [makeMessage()],
      totalCount: 1,
      page: 1,
      pageSize: 30,
    });

    renderThread();

    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });
});
