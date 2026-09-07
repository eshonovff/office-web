import { useTranslation } from 'react-i18next';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChartResult, OperatorLoadPoint } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';

const REQUIRED_SAMPLE_SIZE = 5;

interface OperatorLoadChartProps {
  result: ChartResult<OperatorLoadPoint>;
}

export function OperatorLoadChart({ result }: OperatorLoadChartProps) {
  const { t } = useTranslation('dashboard');

  const config = {
    openConversations: { label: t('stats.operatorLoad.title'), color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  // Height grows with the number of operators so each bar/label stays legible instead of
  // squeezing — a fixed height would make 15 operators unreadable, a fixed-per-row height wastes
  // space for 2.
  const height = Math.max(160, result.data.length * 32);

  return (
    <ChartCard
      title={t('stats.operatorLoad.title')}
      description={t('stats.operatorLoad.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.conversations')}>
      <ChartContainer config={config} className="w-full" style={{ height }}>
        <BarChart data={result.data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="userName"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="openConversations" fill="var(--color-openConversations)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
