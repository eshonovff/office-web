import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import type { ConversationListItem } from '~/types/conversation';
import { useInboxStore } from '../store';
import { useInboxBreakpoint } from '../useInboxBreakpoint';
import { ConversationList } from './ConversationList';

vi.mock('~/api/conversations', () => ({
  conversationsApi: {
    list: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
  },
}));
vi.mock('../useInboxBreakpoint', () => ({ useInboxBreakpoint: vi.fn() }));

const channelOptions = [{ value: 'ch1', label: 'WhatsApp' }];
const assigneeFilterOptions = [
  { userId: 'me', fullName: 'Ман худам' },
  { userId: 'u2', fullName: 'Далер' },
];

function makeConversation(overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    id: overrides.id ?? 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'WhatsApp',
    externalId: overrides.id ?? 'c1',
    contactName: null,
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

function renderList(props: Partial<ComponentProps<typeof ConversationList>> = {}) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConversationList
        channelOptions={channelOptions}
        selectedId={null}
        draggable={false}
        onSelect={vi.fn()}
        assigneeFilterOptions={assigneeFilterOptions}
        canFilterByAssignee={false}
        currentUserId="me"
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('ConversationList filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInboxStore.getState().reset();
    vi.mocked(conversationsApi.list).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
  });

  it('shows both selects inline at the tablet/desktop tier', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    renderList();

    expect(screen.getByPlaceholderText('allChannels')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('allStatuses')).toBeInTheDocument();
    expect(screen.queryByText('filters')).not.toBeInTheDocument();
  });

  it('collapses both selects behind a single filter button on mobile', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    renderList();

    expect(screen.getByText('filters')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('allChannels')).not.toBeInTheDocument();
  });

  it('opens the filter sheet with both selects on tap, on mobile', async () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByText('filters'));

    expect(screen.getByPlaceholderText('allChannels')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('allStatuses')).toBeInTheDocument();
  });

  it('shows a count badge on the filter button once a filter is active', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    useInboxStore.getState().setStatus('New');
    renderList();

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('hides the assignee select when the user cannot filter by assignee', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    renderList({ canFilterByAssignee: false });

    expect(screen.queryByPlaceholderText('allAssignees')).not.toBeInTheDocument();
  });

  it('offers "me", "unassigned", and the channel-scoped roster as assignee options', async () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    const user = userEvent.setup();
    renderList({ canFilterByAssignee: true });

    await user.click(screen.getByPlaceholderText('allAssignees'));

    expect(screen.getByText('assignedToMe')).toBeInTheDocument();
    expect(screen.getByText('unassigned')).toBeInTheDocument();
    expect(screen.getByText('Далер')).toBeInTheDocument();
    // The current user isn't listed twice — "assignedToMe" already covers them.
    expect(screen.queryByText('Ман худам')).not.toBeInTheDocument();
  });

  it('requests assignedUserId=<current user> when "me" is selected', async () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    const user = userEvent.setup();
    renderList({ canFilterByAssignee: true, currentUserId: 'me' });

    await user.click(screen.getByPlaceholderText('allAssignees'));
    await user.click(screen.getByText('assignedToMe'));

    await waitFor(() =>
      expect(conversationsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ assignedUserId: 'me' })
      )
    );
  });

  it('filters unassigned conversations client-side, since the backend has no query param for it', async () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    vi.mocked(conversationsApi.list).mockResolvedValue({
      items: [makeConversation({ id: 'has-owner', assignedTo: 'u2' }), makeConversation({ id: 'no-owner', assignedTo: null })],
      totalCount: 2,
      page: 1,
      pageSize: 20,
    });
    const user = userEvent.setup();
    renderList({ canFilterByAssignee: true });

    await waitFor(() => expect(screen.getByText('has-owner')).toBeInTheDocument());
    expect(screen.getByText('no-owner')).toBeInTheDocument();

    await user.click(screen.getByPlaceholderText('allAssignees'));
    await user.click(screen.getByText('unassigned'));

    await waitFor(() => expect(screen.queryByText('has-owner')).not.toBeInTheDocument());
    expect(screen.getByText('no-owner')).toBeInTheDocument();
    // No assignedUserId sent — the request stays identical to "no filter".
    expect(conversationsApi.list).toHaveBeenLastCalledWith(expect.not.objectContaining({ assignedUserId: expect.anything() }));
  });
});
