import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '~/components/ui/chart';
import type { ChartResult, FailedMessageGroup } from '~/types/dashboardStats';
import { translateFailureCode } from '../../failureCode';
import { ChartCard } from './ChartCard';

const REQUIRED_SAMPLE_SIZE = 5;

interface FailureBreakdownChartProps {
  result: ChartResult<FailedMessageGroup>;
}

export function FailureBreakdownChart({ result }: FailureBreakdownChartProps) {
  const { t } = useTranslation('dashboard');

  // The raw code (or a stand-in for null) stays on the X-axis for compactness — translated
  // reasons can run to a full sentence, which would either overlap or force ugly rotated labels.
  // The full translation shows in the tooltip on hover/tap, and in the list below for anyone who
  // can't hover (touch devices, screen readers).
  const config = {
    count: { label: t('stats.failureBreakdown.title'), color: 'var(--chart-4)' },
  } satisfies ChartConfig;

  const data = result.data.map((group) => ({
    ...group,
    axisLabel: group.failureCode ?? t('failureCode.none', { ns: 'dashboard' }),
    translated: translateFailureCode(t, group.failureCode),
  }));

  return (
    <ChartCard
      title={t('stats.failureBreakdown.title')}
      description={t('stats.failureBreakdown.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.failedMessages')}>
      <ChartContainer config={config} className="h-48 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="axisLabel" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => (
                  <span className="text-foreground">
                    {(item.payload as { translated: string }).translated}: <span className="font-mono font-medium tabular-nums">{value}</span>
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
      <ul className="mt-2 min-w-0 space-y-1">
        {data.map((group) => (
          <li key={group.failureCode ?? 'null'} className="flex min-w-0 items-start gap-1.5 text-2xs">
            <span className="tabular-nums">{group.count} ×</span>
            <span className="text-muted-foreground min-w-0 flex-1 [overflow-wrap:anywhere]">{group.translated}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
