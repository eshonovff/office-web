import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import type { ConversationListItem as ConversationListItemType } from '~/types/conversation';
import { ConversationListItem } from './ConversationListItem';

vi.mock('~/api/conversations', () => ({
  conversationsApi: { getMediaBlob: vi.fn(), getThumbnailBlob: vi.fn(), cancelMessage: vi.fn() },
}));

function makeConversation(overrides: Partial<ConversationListItemType> = {}): ConversationListItemType {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'WhatsApp',
    externalId: '992509886588',
    contactName: null,
    contactAvatarUrl: null,
    contactUsername: null,
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

describe('ConversationListItem display name', () => {
  it('shows contactName when it is set', () => {
    render(
      <ConversationListItem
        conversation={makeConversation({ contactName: 'Далер' })}
        active={false}
        draggable={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Далер')).toBeInTheDocument();
  });

  it('falls back to externalId instead of a blank name when contactName is null', () => {
    render(
      <ConversationListItem
        conversation={makeConversation({ contactName: null, externalId: '992509886588' })}
        active={false}
        draggable={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('992509886588')).toBeInTheDocument();
  });

  it('falls back to externalId when contactName is an empty string', () => {
    render(
      <ConversationListItem
        conversation={makeConversation({ contactName: '', externalId: '992509886588' })}
        active={false}
        draggable={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('992509886588')).toBeInTheDocument();
  });
});

describe('ConversationListItem picture', () => {
  it('fetches our own copy with the staff token — never shows the link as it is', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    vi.mocked(conversationsApi.getThumbnailBlob).mockResolvedValue(new Blob(['jpg']));
    const path = '/api/conversations/c1/avatar?v=list-item';
    const { container } = render(
      <ConversationListItem
        conversation={makeConversation({ contactName: 'Далер', contactAvatarUrl: path })}
        active={false}
        draggable={false}
        onClick={vi.fn()}
      />
    );

    await waitFor(() => expect(conversationsApi.getThumbnailBlob).toHaveBeenCalledWith(path));
    expect(container.querySelector(`img[src="${path}"]`)).toBeNull();
    vi.unstubAllGlobals();
  });
});
