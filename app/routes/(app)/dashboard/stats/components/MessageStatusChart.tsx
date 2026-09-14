import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChartResult, MessageStatusPoint } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';
import { chartColorAt } from './chartColors';

const REQUIRED_SAMPLE_SIZE = 20;

interface MessageStatusChartProps {
  result: ChartResult<MessageStatusPoint>;
}

export function MessageStatusChart({ result }: MessageStatusChartProps) {
  const { t } = useTranslation('dashboard');

  const statusLabel = (status: string) => t(`stats.messageStatus.status.${status}`, { defaultValue: status });

  const config = result.data.reduce((acc, point, index) => {
    acc[point.status] = { label: statusLabel(point.status), color: chartColorAt(index) };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartCard
      title={t('stats.messageStatus.title')}
      description={t('stats.messageStatus.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.messages')}>
      <ChartContainer config={config} className="h-56 w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
          <Pie data={result.data} dataKey="count" nameKey="status" innerRadius={40} outerRadius={70} strokeWidth={2}>
            {result.data.map((point, index) => (
              <Cell key={point.status} fill={chartColorAt(index)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 min-w-0 space-y-1">
        {result.data.map((point, index) => (
          <li key={point.status} className="flex min-w-0 items-center gap-1.5 text-2xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColorAt(index) }} />
            <span className="min-w-0 flex-1 truncate">{statusLabel(point.status)}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">{point.count}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
