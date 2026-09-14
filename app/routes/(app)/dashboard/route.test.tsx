import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '~/api/dashboard';
import { makeQueryClient } from '~/lib/query-client';
import type { DashboardResponse } from '~/types/dashboard';
import DashboardLayout from './route';

vi.mock('~/api/dashboard', () => ({
  dashboardApi: { get: vi.fn() },
}));

function makeResponse(canSeeStats: boolean): DashboardResponse {
  return {
    actionRequired: {
      closingWindows: { count: 0, items: [] },
      unassigned: 0,
      failedMessages: { count: 0, groups: [] },
      channelIssues: { count: 0, items: [] },
      overdueTasks: { count: 0, items: [] },
    },
    myWork: { myConversations: [], myUnread: 0, myTasksToday: { count: 0, items: [] }, myTasksOverdue: { count: 0, items: [] } },
    canSeeStats,
  };
}

function renderLayout(initialPath = '/dashboard') {
  const queryClient = makeQueryClient();
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>overview content</div>} />
            <Route path="stats" element={<div>stats content</div>} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DashboardLayout tabs — visibility (from the backend\'s canSeeStats, not a local role guess) and URL-driven state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows only the Overview tab while canSeeStats is false', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(makeResponse(false));
    renderLayout();

    expect(screen.getByText('tabs.overview')).toBeInTheDocument();
    await waitFor(() => expect(dashboardApi.get).toHaveBeenCalled());
    expect(screen.queryByText('tabs.stats')).not.toBeInTheDocument();
  });

  it('shows both tabs once the dashboard response says canSeeStats is true', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(makeResponse(true));
    renderLayout();

    expect(await screen.findByText('tabs.stats')).toBeInTheDocument();
    expect(screen.getByText('tabs.overview')).toBeInTheDocument();
  });

  it('does not show the Stats tab before the dashboard query has resolved (fails closed for a nav tab, not open)', () => {
    vi.mocked(dashboardApi.get).mockReturnValue(new Promise(() => {})); // never resolves
    renderLayout();

    expect(screen.queryByText('tabs.stats')).not.toBeInTheDocument();
  });

  it('renders the child route matching the current URL (refresh-safe tab state)', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(makeResponse(true));
    renderLayout('/dashboard/stats');

    expect(screen.getByText('stats content')).toBeInTheDocument();
    expect(screen.queryByText('overview content')).not.toBeInTheDocument();
  });
});
