import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { dashboardApi } from '~/api/dashboard';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { ActionRequiredSection } from './components/ActionRequiredSection';
import { MyWorkSection } from './components/MyWorkSection';

// The "Обзор" tab (/dashboard) — the parent route (../route.tsx) owns the title/tabs shell and
// has no request of its own; this is the only place actionRequired/myWork is ever fetched.
export default function DashboardOverviewPage() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    staleTime: 60 * 1000,
  });

  // 401 already logs the user out globally (app/lib/client.ts's response interceptor) — this
  // page only needs to handle 403 (authenticated, but lacking the permission this page needs).
  useEffect(() => {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 403) navigate('/login', { replace: true });
  }, [error, navigate]);

  return (
    <div className="min-w-0">
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border py-16 text-center">
          <AlertCircle className="text-destructive h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('loadFailed')}</p>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('retry')}
          </Button>
        </div>
      ) : (
        data && (
          <div className="grid min-w-0 grid-cols-1 gap-6">
            <ActionRequiredSection data={data.actionRequired} />
            <MyWorkSection data={data.myWork} />
          </div>
        )
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
