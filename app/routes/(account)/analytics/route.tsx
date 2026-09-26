import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AlertCircle, ChartColumn, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { customerAnalyticsApi, customerAnalyticsKeys } from '~/api/customerAnalytics';
import { customerChannelsApi } from '~/api/customerFlows';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button, buttonVariants } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import { CUSTOMER_CHANNELS_QUERY_KEY } from '~/routes/(account)/settings/useInstagramConnect';
import type { AnalyticsQuery, AnalyticsRange } from '~/types/customerAnalytics';
import { dushanbeToday, previousRange, resolvePeriod } from './analytics';
import { ActivityChart } from './components/ActivityChart';
import { BroadcastsSection } from './components/BroadcastsSection';
import { FlowDetailModal } from './components/FlowDetailModal';
import { FlowsSection } from './components/FlowsSection';
import { PeriodPicker } from './components/PeriodPicker';
import { RulesSection } from './components/RulesSection';
import { StatCards } from './components/StatCards';
import { TopPostsSection } from './components/TopPostsSection';

const day = (date: string) => dayjs(date).format('DD.MM.YYYY');

// What the мизоҷ's automations, comment auto-replies, broadcasts and chats did in a period, next to
// the period before. Access is the (account) layout's мизоҷ session; every call goes to /api/public,
// where each number is made only of this мизоҷ's own rows. Reading them needs no plan.
export default function AnalyticsPage() {
  const { t } = useTranslation('customerAuth');
  const [searchParams, setSearchParams] = useSearchParams();
  const today = dushanbeToday();
  const period = resolvePeriod(searchParams, today);
  const range: AnalyticsRange = { from: period.from, to: period.to };

  const { data: channels } = useQuery({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY, queryFn: customerChannelsApi.list });
  // Only one of the мизоҷ's own accounts is ever asked for — an id typed into the URL is ignored.
  const channelId = channels?.find((c) => c.id === searchParams.get('channel'))?.id;
  const query: AnalyticsQuery = { ...range, channelId };
  const ready = !!channels && channels.length > 0;

  // A new period keeps the last numbers on screen (dimmed) until its own arrive; the dates shown
  // always come with the numbers, from the same answer.
  const overview = useQuery({
    queryKey: customerAnalyticsKeys.overview(query),
    queryFn: () => customerAnalyticsApi.overview(query),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const automations = useQuery({
    queryKey: customerAnalyticsKeys.automations(query),
    queryFn: () => customerAnalyticsApi.automations(query),
    enabled: ready,
    placeholderData: keepPreviousData,
  });

  const setParams = (changes: Record<string, string | null>, replace = true) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace }
    );

  // Opened only from the rows the server gave for this мизоҷ — an id typed into the URL is ignored.
  const openedFlow = automations.data?.flows.find((f) => f.flowId === searchParams.get('flow')) ?? null;

  if (channels && channels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ChartColumn className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{t('analytics.noChannel')}</p>
        <Link to="/account/settings" className={buttonVariants()}>
          {t('analytics.connectInstagram')}
        </Link>
      </div>
    );
  }

  const shown = overview.data;
  const before = shown && previousRange(shown);

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('analytics.title')}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('analytics.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PeriodPicker
          key={period.preset === null ? 'dates' : 'preset'}
          period={period}
          today={today}
          onPreset={(preset) => setParams({ days: String(preset), from: null, to: null })}
          onRange={({ from, to }) => setParams({ from, to, days: null })}
        />
        {channels && channels.length > 1 && (
          <CustomSelect
            className="w-full sm:w-56"
            placeholder={t('analytics.allAccounts')}
            isClearable
            options={channels.map((c) => ({ value: c.id, label: c.name }))}
            value={channelId ?? null}
            onChange={(v) => setParams({ channel: v ? String(v) : null, flow: null })}
          />
        )}
      </div>

      {shown && before && (
        <p className="text-muted-foreground text-xs">
          {t('analytics.range', { from: day(shown.from), to: day(shown.to) })}
          {' · '}
          {t('analytics.compared', { from: day(before.from), to: day(before.to) })}
        </p>
      )}

      {!shown ? (
        overview.isError ? (
          <LoadFailed retrying={overview.isFetching} onRetry={() => void overview.refetch()} />
        ) : (
          <PageSkeleton />
        )
      ) : (
        <div className={cn('space-y-4 transition-opacity', overview.isPlaceholderData && 'opacity-60')}>
          <StatCards overview={shown} />
          <ActivityChart days={shown.days} />

          {automations.data ? (
            <div className={cn('space-y-4 transition-opacity', automations.isPlaceholderData && 'opacity-60')}>
              <FlowsSection flows={automations.data.flows} onOpen={(id) => setParams({ flow: id }, false)} />
              <RulesSection rules={automations.data.rules} />
            </div>
          ) : automations.isError ? (
            <LoadFailed retrying={automations.isFetching} onRetry={() => void automations.refetch()} />
          ) : (
            <Skeleton className="h-40 rounded-xl" />
          )}

          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
            <BroadcastsSection broadcasts={shown.broadcasts} />
            <TopPostsSection posts={shown.topPosts} channels={channels ?? []} />
          </div>
        </div>
      )}

      {openedFlow && (
        <FlowDetailModal flow={openedFlow} range={range} onClose={() => setParams({ flow: null }, false)} />
      )}
    </div>
  );
}

function LoadFailed({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation('customerAuth');
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border py-12 text-center">
      <AlertCircle className="text-destructive size-7" />
      <p className="text-muted-foreground text-sm">{t('analytics.loadFailed')}</p>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={retrying} onClick={onRetry}>
        <RefreshCw className="size-3.5" />
        {t('analytics.retry')}
      </Button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
