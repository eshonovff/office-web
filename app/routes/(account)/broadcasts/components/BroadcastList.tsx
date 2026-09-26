import dayjs from 'dayjs';
import { Send, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { formatDate } from '~/lib/format';
import type { BroadcastListItem } from '~/types/customerBroadcasts';
import { STATUS_VARIANT, progress, sendingAccounts } from '../broadcastStatus';

interface BroadcastListProps {
  broadcasts: BroadcastListItem[];
  /** Account names by id — shown only when the мизоҷ has more than one. */
  accountNames?: Record<string, string>;
  onOpen: (id: string) => void;
}

/**
 * The time that matters for each state: when it starts, when it began, or when it ended. One whose
 * time has come waits while another broadcast of the same account is sending (one at a time).
 */
export function BroadcastWhen({
  broadcast,
  waitingForAnother = false,
}: {
  broadcast: BroadcastListItem;
  waitingForAnother?: boolean;
}) {
  const { t } = useTranslation('customerAuth');
  if (broadcast.status === 'Scheduled') {
    if (dayjs(broadcast.scheduledAt).isAfter(dayjs()))
      return <>{t('broadcasts.when.scheduled', { date: formatDate(broadcast.scheduledAt, true) })}</>;
    return <>{t(waitingForAnother ? 'broadcasts.when.waiting' : 'broadcasts.when.starting')}</>;
  }
  if (broadcast.status === 'Sending')
    return <>{t('broadcasts.when.sending', { date: formatDate(broadcast.startedAt, true) })}</>;
  return <>{formatDate(broadcast.finishedAt ?? broadcast.scheduledAt, true)}</>;
}

export function BroadcastList({ broadcasts, accountNames, onOpen }: BroadcastListProps) {
  const { t } = useTranslation('customerAuth');
  const busy = sendingAccounts(broadcasts);

  return (
    <ul className="divide-y rounded-xl border">
      {broadcasts.map((b) => {
        const Icon = b.kind === 'flow' ? Workflow : Send;
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onOpen(b.id)}
              className="hover:bg-muted/50 flex w-full items-start gap-3 p-3 text-left transition-colors sm:p-4">
              <span className="bg-primary/10 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{b.name}</span>
                  <Badge variant={STATUS_VARIANT[b.status]} className="shrink-0 text-[11px]">
                    {t(`broadcasts.status.${b.status}`)}
                  </Badge>
                </span>
                <span className="text-muted-foreground block text-xs">
                  <BroadcastWhen broadcast={b} waitingForAnother={busy.has(b.channelId)} />
                  {accountNames?.[b.channelId] && <> · {accountNames[b.channelId]}</>}
                </span>
                {b.error && <span className="text-destructive block truncate text-xs">{b.error}</span>}
                {b.startedAt && !(b.error && b.recipients === 0) && (
                  <span className="block text-xs">
                    {t('broadcasts.counts', { sent: b.sent, skipped: b.skipped, failed: b.failed })}
                  </span>
                )}
                {b.status === 'Sending' && (
                  <Progress
                    value={progress(b)}
                    className="h-1.5"
                    aria-label={t('broadcasts.progress', { percent: progress(b) })}
                  />
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
