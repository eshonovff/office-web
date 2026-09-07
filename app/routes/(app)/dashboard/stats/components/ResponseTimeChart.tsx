import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChartResult, ResponseTimeBucket } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';

const REQUIRED_SAMPLE_SIZE = 20;

interface ResponseTimeChartProps {
  result: ChartResult<ResponseTimeBucket> & { unanswered: number };
}

export function ResponseTimeChart({ result }: ResponseTimeChartProps) {
  const { t } = useTranslation('dashboard');

  const config = {
    count: { label: t('stats.responseTimeBuckets.title'), color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t('stats.responseTimeBuckets.title')}
      description={t('stats.responseTimeBuckets.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.respondedConversations')}>
      <ChartContainer config={config} className="h-48 w-full">
        <BarChart data={result.data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
      {result.unanswered > 0 && (
        <p className="text-muted-foreground mt-2 min-w-0 text-2xs [overflow-wrap:anywhere]">
          {t('stats.responseTimeBuckets.unanswered', { count: result.unanswered })}
        </p>
      )}
    </ChartCard>
  );
}
