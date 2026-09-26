import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { customerAnalyticsApi, customerAnalyticsKeys } from '~/api/customerAnalytics';
import { Modal } from '~/components/shared/Modal';
import { Badge } from '~/components/ui/badge';
import { buttonVariants } from '~/components/ui/button';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart';
import { Skeleton } from '~/components/ui/skeleton';
import { fmtNumber, formatDate } from '~/lib/format';
import type { AnalyticsCount, AnalyticsFlowDay, AnalyticsFlowRow, AnalyticsRange } from '~/types/customerAnalytics';
import { percentOf } from '../analytics';
import { ChangeLabel } from './ChangeLabel';

interface FlowDetailModalProps {
  flow: AnalyticsFlowRow;
  range: AnalyticsRange;
  onClose: () => void;
}

// One automation in the page's period: its days and the people who started it last — each links to
// that person's contact card. The server answers only for the мизоҷ's own automation.
export function FlowDetailModal({ flow, range, onClose }: FlowDetailModalProps) {
  const { t } = useTranslation('customerAuth');
  const { data, isLoading, isError } = useQuery({
    queryKey: customerAnalyticsKeys.flow(flow.flowId, range),
    queryFn: () => customerAnalyticsApi.flow(flow.flowId, range),
  });
  const rate = data ? percentOf(data.converted.current, data.started.current) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={flow.name}
      className="sm:max-w-2xl"
      footer={
        <Link to={`/account/automations/flows/${flow.flowId}`} className={buttonVariants({ variant: 'outline' })}>
          {t('analytics.flow.openEditor')}
        </Link>
      }>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('analytics.flow.loadFailed')}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <CountBox title={t('analytics.flows.started')} count={data.started} />
            {data.hasConversionStep ? (
              <>
                <CountBox title={t('analytics.flows.converted')} count={data.converted} />
                <div className="rounded-lg border p-2.5">
                  <p className="text-muted-foreground text-2xs">{t('analytics.flows.rate')}</p>
                  <p className="text-lg font-semibold tabular-nums">{rate === null ? '—' : `${rate}%`}</p>
                </div>
              </>
            ) : (
              <p className="bg-muted/60 col-span-2 rounded-lg px-3 py-2 text-xs">{t('analytics.flow.noGoalHint')}</p>
            )}
          </div>

          <FlowDaysChart days={data.days} withGoal={data.hasConversionStep} />

          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">{t('analytics.flow.starters')}</h3>
              <p className="text-muted-foreground text-2xs">{t('analytics.flow.startersHint')}</p>
            </div>
            {data.recentStarters.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">{t('analytics.flow.startersEmpty')}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.recentStarters.map((starter) => (
                  <li key={starter.contactId}>
                    <Link
                      to={`/account/contacts?c=${encodeURIComponent(starter.contactId)}`}
                      className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {starter.name || (starter.username ? `@${starter.username}` : t('analytics.flow.unnamed'))}
                        </span>
                        {starter.name && starter.username && (
                          <span className="text-muted-foreground text-2xs block truncate">@{starter.username}</span>
                        )}
                      </span>
                      {starter.converted && (
                        <Badge variant="secondary" className="text-success shrink-0">
                          {t('analytics.flow.reachedGoal')}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-2xs shrink-0 tabular-nums">
                        {formatDate(starter.startedAt, true)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function CountBox({ title, count }: { title: string; count: AnalyticsCount }) {
  const { t } = useTranslation('customerAuth');
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-muted-foreground text-2xs">{title}</p>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-lg font-semibold tabular-nums">{fmtNumber(count.current)}</span>
        <ChangeLabel count={count} />
      </p>
      <p className="text-muted-foreground text-2xs tabular-nums">
        {t('analytics.cards.previous', { value: fmtNumber(count.previous) })}
      </p>
    </div>
  );
}

function FlowDaysChart({ days, withGoal }: { days: AnalyticsFlowDay[]; withGoal: boolean }) {
  const { t } = useTranslation('customerAuth');
  const config = {
    started: { label: t('analytics.flows.started'), color: 'var(--chart-1)' },
    converted: { label: t('analytics.flows.converted'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;
  const data = days.map((day) => ({ ...day, label: dayjs(day.date).format('DD.MM') }));

  return (
    <ChartContainer config={config} className="h-52 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="started" fill="var(--color-started)" radius={3} />
        {withGoal && <Bar dataKey="converted" fill="var(--color-converted)" radius={3} />}
      </BarChart>
    </ChartContainer>
  );
}
