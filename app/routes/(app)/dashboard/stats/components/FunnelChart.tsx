import { useTranslation } from 'react-i18next';
import type { ChartResult, FunnelStage } from '~/types/dashboardStats';
import { translateFunnelStage } from '../../funnelStage';
import { ChartCard } from './ChartCard';
import { chartColorAt } from './chartColors';

const REQUIRED_SAMPLE_SIZE = 10;

interface FunnelChartProps {
  result: ChartResult<FunnelStage>;
}

// Three stepped bars rather than a true funnel shape — the spec explicitly allows this fallback,
// and it's far simpler to keep legible/responsive at small widths than an actual tapered funnel.
export function FunnelChart({ result }: FunnelChartProps) {
  const { t } = useTranslation('dashboard');
  const maxCount = Math.max(1, ...result.data.map((stage) => stage.count));

  return (
    <ChartCard
      title={t('stats.funnel.title')}
      description={t('stats.funnel.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.conversations')}>
      <div className="min-w-0 space-y-3">
        {result.data.map((stage, index) => {
          const widthPercent = Math.max(4, (stage.count / maxCount) * 100);
          return (
            <div key={stage.stage} className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2 text-2xs">
                <span className="min-w-0 flex-1 truncate font-medium">{translateFunnelStage(t, stage.stage)}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{stage.count}</span>
              </div>
              <div className="bg-muted h-4 min-w-0 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${widthPercent}%`, backgroundColor: chartColorAt(index) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
