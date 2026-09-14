import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '~/api/dashboard';
import { getQueryClient } from '~/lib/query-client';
import { clientLoader } from './route';

vi.mock('~/api/dashboard', () => ({
  dashboardApi: { get: vi.fn() },
}));

vi.mock('./StatsPageContent', () => ({
  StatsPageContent: () => null,
}));

describe('dashboard/stats clientLoader — route-level guard, not just a hidden tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQueryClient().clear();
  });

  it('redirects to /dashboard when the backend says canSeeStats is false (mirrors ChannelAccessGuard.CanSeeAllChannels)', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      actionRequired: {
        closingWindows: { count: 0, items: [] },
        unassigned: 0,
        failedMessages: { count: 0, groups: [] },
        channelIssues: { count: 0, items: [] },
        overdueTasks: { count: 0, items: [] },
      },
      myWork: { myConversations: [], myUnread: 0, myTasksToday: { count: 0, items: [] }, myTasksOverdue: { count: 0, items: [] } },
      canSeeStats: false,
    });

    const result = await clientLoader();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get('Location')).toBe('/dashboard');
  });

  it('lets the request through when canSeeStats is true', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      actionRequired: {
        closingWindows: { count: 0, items: [] },
        unassigned: 0,
        failedMessages: { count: 0, groups: [] },
        channelIssues: { count: 0, items: [] },
        overdueTasks: { count: 0, items: [] },
      },
      myWork: { myConversations: [], myUnread: 0, myTasksToday: { count: 0, items: [] }, myTasksOverdue: { count: 0, items: [] } },
      canSeeStats: true,
    });

    const result = await clientLoader();

    expect(result).toBeNull();
  });

  it('reuses an already-cached ["dashboard"] query instead of firing a second request (e.g. after visiting Overview first)', async () => {
    getQueryClient().setQueryData(['dashboard'], {
      actionRequired: {
        closingWindows: { count: 0, items: [] },
        unassigned: 0,
        failedMessages: { count: 0, groups: [] },
        channelIssues: { count: 0, items: [] },
        overdueTasks: { count: 0, items: [] },
      },
      myWork: { myConversations: [], myUnread: 0, myTasksToday: { count: 0, items: [] }, myTasksOverdue: { count: 0, items: [] } },
      canSeeStats: true,
    });

    const result = await clientLoader();

    expect(result).toBeNull();
    expect(dashboardApi.get).not.toHaveBeenCalled();
  });
});
