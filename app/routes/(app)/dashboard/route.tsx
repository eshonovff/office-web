import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { dashboardApi } from '~/api/dashboard';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/store/useAuthStore';

// Layout only in the sense that it has no request UNIQUE to it — this ['dashboard'] query is the
// exact same one index/route.tsx makes for its own content, same queryKey/staleTime, so
// TanStack Query serves both from one shared cache entry (one real network call, not two). The
// tab needs canSeeStats (the backend's own ChannelAccessGuard.CanSeeAllChannels check) before it
// can decide whether to show the Stats tab at all — a value only this response carries.
export default function DashboardLayout() {
  const { t } = useTranslation('dashboard');
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get, staleTime: 60 * 1000 });
  const canSeeStats = data?.canSeeStats ?? false;

  return (
    <div className="min-w-0 space-y-4">
      <h1 className="min-w-0 text-xl font-semibold [overflow-wrap:anywhere]">
        {t('title')}
        {user?.fullName ? `, ${user.fullName}` : ''}
      </h1>

      <nav className="scrollbar-thin min-w-0 overflow-x-auto border-b" aria-label={t('tabs.overview')}>
        <div className="flex min-w-max gap-1">
          <DashboardTab to="/dashboard" label={t('tabs.overview')} end />
          {canSeeStats && <DashboardTab to="/dashboard/stats" label={t('tabs.stats')} />}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}

function DashboardTab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'border-primary text-foreground' : 'text-muted-foreground border-transparent hover:text-foreground'
        )
      }>
      {label}
    </NavLink>
  );
}
