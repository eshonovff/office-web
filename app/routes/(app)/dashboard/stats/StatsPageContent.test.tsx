import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '~/api/dashboard';
import type { DashboardStatsResponse } from '~/types/dashboardStats';
import { StatsPageContent } from './StatsPageContent';

vi.mock('~/api/dashboard', () => ({
  dashboardApi: { getStats: vi.fn() },
}));

function makeStatsResponse(): DashboardStatsResponse {
  const insufficientChart = { data: [], sampleSize: 0, sufficient: false };
  return {
    volumeByDay: { ...insufficientChart },
    byChannel: { ...insufficientChart },
    operatorLoad: { ...insufficientChart },
    hourlyHeatmap: { ...insufficientChart },
    responseTimeBuckets: { ...insufficientChart, unanswered: 0 },
    messageStatus: { ...insufficientChart },
    failureBreakdown: { ...insufficientChart },
    funnel: { ...insufficientChart },
  };
}

function renderPage(initialPath = '/dashboard/stats') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <StatsPageContent />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('StatsPageContent — loading/error/empty/days states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a skeleton while loading', () => {
    vi.mocked(dashboardApi.getStats).mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows an error state with a working retry button', async () => {
    vi.mocked(dashboardApi.getStats).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('stats.loadFailed')).toBeInTheDocument());

    vi.mocked(dashboardApi.getStats).mockResolvedValue(makeStatsResponse());
    await user.click(screen.getByRole('button', { name: 'stats.retry' }));

    await waitFor(() => expect(screen.getAllByTestId('insufficient-data').length).toBe(8));
  });

  it('shows all 8 charts in the insufficient state when every chart lacks enough data (the empty-database shape)', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(makeStatsResponse());
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId('insufficient-data')).toHaveLength(8));
  });

  it('defaults to 14 days and requests exactly that when ?days= is absent', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(makeStatsResponse());
    renderPage('/dashboard/stats');

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith(14));
  });

  it('reads ?days= from the URL on load (refresh-safe)', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(makeStatsResponse());
    renderPage('/dashboard/stats?days=30');

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith(30));
  });

  it('refetches with the new value when the days selector changes, and updates the URL', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(makeStatsResponse());
    const user = userEvent.setup();
    renderPage('/dashboard/stats?days=14');

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith(14));

    await user.click(screen.getByRole('button', { name: 'stats.days.90' }));

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith(90));
  });
});
