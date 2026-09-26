import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart';
import type { AnalyticsDay } from '~/types/customerAnalytics';

export function ActivityChart({ days }: { days: AnalyticsDay[] }) {
  const { t } = useTranslation('customerAuth');

  const config = {
    newContacts: { label: t('analytics.cards.newContacts'), color: 'var(--chart-1)' },
    inboundMessages: { label: t('analytics.cards.inboundMessages'), color: 'var(--chart-5)' },
    automaticReplies: { label: t('analytics.cards.automaticReplies'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  const data = days.map((day) => ({ ...day, label: dayjs(day.date).format('DD.MM') }));
  const quiet = days.every((d) => d.newContacts + d.inboundMessages + d.automaticReplies === 0);

  return (
    <section className="bg-card min-w-0 rounded-xl border p-4">
      <h2 className="text-sm font-semibold">{t('analytics.chart.title')}</h2>
      {quiet ? (
        <p className="text-muted-foreground py-12 text-center text-sm">{t('analytics.chart.empty')}</p>
      ) : (
        <ChartContainer config={config} className="mt-3 h-64 w-full">
          <LineChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {(Object.keys(config) as (keyof typeof config)[]).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={days.length <= 14}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}
