import { redirect } from 'react-router';
import { dashboardApi } from '~/api/dashboard';
import { getQueryClient } from '~/lib/query-client';
import { StatsPageContent } from './StatsPageContent';

// Route-level guard, not just a hidden tab — a direct URL visit must never render this page for
// someone who can't see it, only bounce them back to the tab they do have. Uses the backend's own
// canSeeStats flag (ChannelAccessGuard.CanSeeAllChannels) via the same ['dashboard'] query the
// layout/index routes already use — fetchQuery respects staleTime, so this only fires a real
// request when the cache is actually cold (e.g. a direct URL visit, nothing cached yet).
export async function clientLoader() {
  const data = await getQueryClient().fetchQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get, staleTime: 60 * 1000 });
  if (!data.canSeeStats) {
    return redirect('/dashboard');
  }
  return null;
}

export default function DashboardStatsPage() {
  return <StatsPageContent />;
}
