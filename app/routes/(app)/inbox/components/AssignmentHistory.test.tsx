import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import type { ConversationAssignmentEvent } from '~/types/conversation';
import { AssignmentHistory } from './AssignmentHistory';

vi.mock('~/api/conversations', () => ({
  conversationsApi: { listAssignmentHistory: vi.fn() },
}));

function makeEvent(overrides: Partial<ConversationAssignmentEvent> = {}): ConversationAssignmentEvent {
  return {
    id: 'event-1',
    fromUserId: 'user-1',
    fromUserName: 'Азиз',
    toUserId: 'user-2',
    toUserName: 'Далер',
    reason: 'Takeover',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderHistory(conversationId = 'c1') {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AssignmentHistory conversationId={conversationId} />
    </QueryClientProvider>
  );
}

describe('AssignmentHistory', () => {
  it('shows the empty state when there is no history', async () => {
    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
    });

    renderHistory();

    await waitFor(() => expect(screen.getByText('assignmentHistoryEmpty')).toBeInTheDocument());
  });

  it('renders who took the conversation from whom, the reason, and when', async () => {
    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValue({
      items: [makeEvent()],
      totalCount: 1,
      page: 1,
      pageSize: 10,
    });

    renderHistory();

    await waitFor(() => expect(screen.getByText('Азиз → Далер')).toBeInTheDocument());
    expect(screen.getByText('assignmentReason.Takeover')).toBeInTheDocument();
  });

  it('falls back to "unassigned" at the edges — claimed-on-reply has no from, auto-release has no to', async () => {
    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValue({
      items: [
        makeEvent({ id: 'claim', fromUserId: null, fromUserName: null, reason: 'ClaimedOnReply' }),
        makeEvent({ id: 'release', toUserId: null, toUserName: null, reason: 'AutoReleased' }),
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
    });

    renderHistory();

    await waitFor(() => expect(screen.getByText('unassigned → Далер')).toBeInTheDocument());
    expect(screen.getByText('Азиз → unassigned')).toBeInTheDocument();
  });

  it('hides the whole section on a 404 instead of showing it as empty or as an error', async () => {
    vi.mocked(conversationsApi.listAssignmentHistory).mockRejectedValue({ response: { status: 404 } });

    const { container } = renderHistory();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText('assignmentHistory')).not.toBeInTheDocument();
    expect(screen.queryByText('assignmentHistoryEmpty')).not.toBeInTheDocument();
  });

  it('fetches the next page on demand and hides the button once exhausted', async () => {
    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValueOnce({
      items: [makeEvent({ id: 'e1' })],
      totalCount: 2,
      page: 1,
      pageSize: 1,
    });
    const user = userEvent.setup();

    renderHistory();

    await waitFor(() => expect(screen.getByText('assignmentHistoryLoadOlder')).toBeInTheDocument());

    vi.mocked(conversationsApi.listAssignmentHistory).mockResolvedValueOnce({
      items: [makeEvent({ id: 'e2' })],
      totalCount: 2,
      page: 2,
      pageSize: 1,
    });
    await user.click(screen.getByText('assignmentHistoryLoadOlder'));

    await waitFor(() =>
      expect(conversationsApi.listAssignmentHistory).toHaveBeenCalledWith('c1', { page: 2, pageSize: 10 })
    );
    await waitFor(() => expect(screen.queryByText('assignmentHistoryLoadOlder')).not.toBeInTheDocument());
  });
});
