import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { dashboardApi } from '~/api/dashboard';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import type { StatsDays } from '~/types/dashboardStats';
import { ByChannelChart } from './components/ByChannelChart';
import { DaysSelector } from './components/DaysSelector';
import { FailureBreakdownChart } from './components/FailureBreakdownChart';
import { FunnelChart } from './components/FunnelChart';
import { HourlyHeatmapChart } from './components/HourlyHeatmapChart';
import { MessageStatusChart } from './components/MessageStatusChart';
import { OperatorLoadChart } from './components/OperatorLoadChart';
import { ResponseTimeChart } from './components/ResponseTimeChart';
import { VolumeByDayChart } from './components/VolumeByDayChart';
import { resolveStatsDays } from './statsDays';

// Split out from route.tsx so the route module's own export (clientLoader) stays trivially
// testable without dragging Recharts/every chart component into that test file too.
export function StatsPageContent() {
  const { t } = useTranslation('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const days = resolveStatsDays(searchParams);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'stats', days],
    queryFn: () => dashboardApi.getStats(days),
    staleTime: 60 * 1000,
  });

  function setDays(next: StatsDays) {
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        nextParams.set('days', String(next));
        return nextParams;
      },
      { replace: true }
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 items-center justify-end">
        <DaysSelector value={days} onChange={setDays} />
      </div>

      {isLoading ? (
        <StatsSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border py-16 text-center">
          <AlertCircle className="text-destructive h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('stats.loadFailed')}</p>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('stats.retry')}
          </Button>
        </div>
      ) : (
        data && (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <VolumeByDayChart result={data.volumeByDay} />
            <ByChannelChart result={data.byChannel} />
            <OperatorLoadChart result={data.operatorLoad} />
            <HourlyHeatmapChart result={data.hourlyHeatmap} />
            <ResponseTimeChart result={data.responseTimeBuckets} />
            <MessageStatusChart result={data.messageStatus} />
            <FailureBreakdownChart result={data.failureBreakdown} />
            <FunnelChart result={data.funnel} />
          </div>
        )
      )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}
