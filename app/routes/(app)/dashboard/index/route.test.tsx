import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '~/api/dashboard';
import type { DashboardResponse } from '~/types/dashboard';
import DashboardPage from './route';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('~/api/dashboard', () => ({
  dashboardApi: { get: vi.fn() },
}));

function emptyResponse(): DashboardResponse {
  return {
    actionRequired: {
      closingWindows: { count: 0, items: [] },
      unassigned: 0,
      failedMessages: { count: 0, groups: [] },
      channelIssues: { count: 0, items: [] },
      overdueTasks: { count: 0, items: [] },
    },
    myWork: {
      myConversations: [],
      myUnread: 0,
      myTasksToday: { count: 0, items: [] },
      myTasksOverdue: { count: 0, items: [] },
    },
    canSeeStats: false,
  };
}

function renderPage() {
  // retry: false — these tests assert the error state directly; the app's real default (a
  // couple of retries with backoff, see lib/query-client.ts) would just make them slow/flaky
  // here without testing anything this suite cares about.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage — loading/error/empty/403 states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a skeleton while loading, not a spinner in an empty screen', () => {
    vi.mocked(dashboardApi.get).mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderPage();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('loadFailed')).not.toBeInTheDocument();
    expect(screen.queryByText('actionRequired.allClearTitle')).not.toBeInTheDocument();
  });

  it('shows an error state with a working retry button', async () => {
    vi.mocked(dashboardApi.get).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('loadFailed')).toBeInTheDocument());
    expect(vi.mocked(dashboardApi.get)).toHaveBeenCalledTimes(1);

    vi.mocked(dashboardApi.get).mockResolvedValue(emptyResponse());
    await user.click(screen.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(screen.getByText('actionRequired.allClearTitle')).toBeInTheDocument());
  });

  it('redirects to /login on a 403 instead of showing a generic error', async () => {
    vi.mocked(dashboardApi.get).mockRejectedValue({ response: { status: 403 } });
    renderPage();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
  });

  it('does not redirect on a non-403/401 error', async () => {
    vi.mocked(dashboardApi.get).mockRejectedValue({ response: { status: 500 } });
    renderPage();

    await waitFor(() => expect(screen.getByText('loadFailed')).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows one calm "all clear" state instead of five empty cards when every count is zero', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(emptyResponse());
    renderPage();

    await waitFor(() => expect(screen.getByText('actionRequired.allClearTitle')).toBeInTheDocument());
    expect(screen.queryByText('actionRequired.unassigned.title')).not.toBeInTheDocument();
    expect(screen.queryByText('actionRequired.channelIssues.title')).not.toBeInTheDocument();
  });
});

describe('DashboardPage — actionRequired links (block, item 3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('links closingWindows preview items to the exact conversation in inbox', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: {
        ...emptyResponse().actionRequired,
        closingWindows: {
          count: 1,
          items: [{ conversationId: 'conv-1', contactLabel: 'Далер', windowExpiresAt: new Date(Date.now() + 3600_000).toISOString() }],
        },
      },
    });
    renderPage();

    const link = await screen.findByText('Далер');
    expect(link.closest('a')).toHaveAttribute('href', '/inbox?conversation=conv-1');
  });

  it('links the unassigned card to inbox filtered by New status and the unassigned sentinel', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: { ...emptyResponse().actionRequired, unassigned: 45 },
    });
    renderPage();

    const title = await screen.findByText('actionRequired.unassigned.title');
    expect(title.closest('a')).toHaveAttribute('href', '/inbox?status=New&assignee=unassigned');
  });

  it('links the failedMessages card to inbox (no per-conversation filter exists for this) and translates the failureCode client-side — the backend stopped sending a ready-made label', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: {
        ...emptyResponse().actionRequired,
        failedMessages: { count: 14, groups: [{ failureCode: 'IG_2', count: 14 }] },
      },
    });
    renderPage();

    // useTranslation is mocked (this suite's convention) to return the raw key — confirms the
    // group is run through translateFailureCode, not left showing raw JSON/code.
    expect(await screen.findByText(/failureCode\.exact\.IG_2/)).toBeInTheDocument();
    const title = screen.getByText('actionRequired.failedMessages.title');
    expect(title.closest('a')).toHaveAttribute('href', '/inbox');
  });

  it('links channelIssues items to the Channels page with the specific channel id and shows its reason', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: {
        ...emptyResponse().actionRequired,
        channelIssues: { count: 1, items: [{ channelId: 'ch-1', channelName: 'Test WA', reason: 'Пайвастшавӣ лозим аст.' }] },
      },
    });
    renderPage();

    const link = await screen.findByText('Test WA');
    expect(link.closest('a')).toHaveAttribute('href', '/channels?channel=ch-1');
    expect(screen.getByText('Пайвастшавӣ лозим аст.')).toBeInTheDocument();
  });

  it('links overdueTasks items to the exact project board with the task open', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: {
        ...emptyResponse().actionRequired,
        overdueTasks: { count: 1, items: [{ id: 'task-1', title: 'Fix bug', projectName: 'NIZOM', projectId: 'proj-1' }] },
      },
    });
    renderPage();

    const link = await screen.findByText('Fix bug');
    expect(link.closest('a')).toHaveAttribute('href', '/projects/proj-1?task=task-1');
  });

  it('shows a "+N more" line when there are more items than the preview list', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      actionRequired: {
        ...emptyResponse().actionRequired,
        channelIssues: {
          count: 7,
          items: [{ channelId: 'ch-1', channelName: 'Only one shown', reason: 'x' }],
        },
      },
    });
    renderPage();

    await screen.findByText('Only one shown');
    expect(screen.getByText('actionRequired.moreCount')).toBeInTheDocument();
  });
});

describe('DashboardPage — myWork links', () => {
  beforeEach(() => vi.clearAllMocks());

  it('links a conversation status group to inbox filtered by that status and assignee=me', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      myWork: { ...emptyResponse().myWork, myConversations: [{ status: 'InProgress', count: 3 }] },
    });
    renderPage();

    const title = await screen.findByText('status.InProgress');
    expect(title.closest('a')).toHaveAttribute('href', '/inbox?status=InProgress&assignee=me');
  });

  it('shows the calm empty text when there are no assigned conversations', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(emptyResponse());
    renderPage();

    expect(await screen.findByText('myWork.noConversations')).toBeInTheDocument();
  });

  it('links the unread count to my own conversations in inbox', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      myWork: { ...emptyResponse().myWork, myConversations: [{ status: 'New', count: 2 }], myUnread: 7 },
    });
    renderPage();

    const link = await screen.findByText('myWork.unreadCount');
    expect(link.closest('a')).toHaveAttribute('href', '/inbox?assignee=me');
  });

  it('links a myTasksToday item to its own project board with the task open', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      ...emptyResponse(),
      myWork: {
        ...emptyResponse().myWork,
        myTasksToday: { count: 1, items: [{ id: 'task-2', title: 'Today task', projectName: 'P', projectId: 'proj-2' }] },
      },
    });
    renderPage();

    const link = await screen.findByText('Today task');
    expect(link.closest('a')).toHaveAttribute('href', '/projects/proj-2?task=task-2');
  });
});
