import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChannelVolumePoint, ChartResult } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';
import { chartColorAt } from './chartColors';

const REQUIRED_SAMPLE_SIZE = 5;

interface ByChannelChartProps {
  result: ChartResult<ChannelVolumePoint>;
}

export function ByChannelChart({ result }: ByChannelChartProps) {
  const { t } = useTranslation('dashboard');

  const config = result.data.reduce((acc, point, index) => {
    acc[point.channelId] = { label: point.channelName, color: chartColorAt(index) };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartCard
      title={t('stats.byChannel.title')}
      description={t('stats.byChannel.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.conversations')}>
      <ChartContainer config={config} className="h-56 w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="channelId" hideLabel />} />
          <Pie data={result.data} dataKey="activeConversations" nameKey="channelId" innerRadius={40} outerRadius={70} strokeWidth={2}>
            {result.data.map((point, index) => (
              <Cell key={point.channelId} fill={chartColorAt(index)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 min-w-0 space-y-1">
        {result.data.map((point, index) => (
          <li key={point.channelId} className="flex min-w-0 items-center gap-1.5 text-2xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColorAt(index) }} />
            <span className="min-w-0 flex-1 truncate">{point.channelName}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">{point.activeConversations}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
