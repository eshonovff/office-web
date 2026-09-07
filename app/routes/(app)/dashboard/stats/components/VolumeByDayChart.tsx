import dayjs from 'dayjs';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChartResult, DayVolumePoint } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';

const REQUIRED_SAMPLE_SIZE = 7;

interface VolumeByDayChartProps {
  result: ChartResult<DayVolumePoint>;
}

export function VolumeByDayChart({ result }: VolumeByDayChartProps) {
  const { t } = useTranslation('dashboard');

  const config = {
    inbound: { label: t('stats.volumeByDay.inbound'), color: 'var(--chart-1)' },
    outbound: { label: t('stats.volumeByDay.outbound'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  const data = result.data.map((point) => ({ ...point, label: dayjs(point.date).format('DD.MM') }));

  return (
    <ChartCard
      title={t('stats.volumeByDay.title')}
      description={t('stats.volumeByDay.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.activeDays')}>
      <ChartContainer config={config} className="h-56 w-full">
        <LineChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="inbound" stroke="var(--color-inbound)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="outbound" stroke="var(--color-outbound)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
