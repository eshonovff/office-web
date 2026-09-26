import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerBroadcastKeys, customerBroadcastsApi } from '~/api/customerBroadcasts';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Modal } from '~/components/shared/Modal';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Skeleton } from '~/components/ui/skeleton';
import { STATUS_VARIANT, isOpen, progress } from '../broadcastStatus';
import { BroadcastWhen } from './BroadcastList';

interface BroadcastCardProps {
  broadcastId: string;
  accountName?: string;
  /** Another broadcast of the same account is sending — this one waits for it. */
  waitingForAnother?: boolean;
  onClose: () => void;
}

type Action = 'cancel' | 'stop' | 'delete';

/** The message as the мизоҷ wrote it, with the "name" placeholder shown as what it becomes. */
function MessageText({ text }: { text: string }) {
  const { t } = useTranslation('customerAuth');
  return (
    <>
      {text.split(/(\{\{firstName\}\})/g).map((part, i) =>
        part === '{{firstName}}' ? (
          <span key={i} className="bg-primary/15 text-primary rounded px-1">
            {t('broadcasts.form.insertName')}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

// One broadcast: its numbers, what was sent to whom, who it failed for and why — and the one
// thing that can still be done with it (cancel before it starts, stop while sending, remove
// once it is over). None of these needs a plan. Only /api/public, so only this мизоҷ's own.
export function BroadcastCard({ broadcastId, accountName, waitingForAnother, onClose }: BroadcastCardProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: customerBroadcastKeys.detail(broadcastId),
    queryFn: () => customerBroadcastsApi.get(broadcastId),
    refetchInterval: (query) => (query.state.data && isOpen(query.state.data.summary.status) ? 5000 : false),
  });

  const run = useMutation({
    mutationFn: (a: Action) =>
      a === 'delete' ? customerBroadcastsApi.remove(broadcastId) : customerBroadcastsApi.cancel(broadcastId),
    onSuccess: (_, a) => {
      toast.success(t(`broadcasts.done.${a}`));
      setAction(null);
      if (a === 'delete') {
        queryClient.removeQueries({ queryKey: customerBroadcastKeys.detail(broadcastId) });
        onClose();
      }
      void queryClient.invalidateQueries({ queryKey: customerBroadcastKeys.all });
    },
  });

  const summary = data?.summary;
  const available: Action | null =
    summary?.status === 'Scheduled' ? 'cancel' : summary?.status === 'Sending' ? 'stop' : summary ? 'delete' : null;

  const footer = available && (
    <Button
      type="button"
      variant={available === 'delete' ? 'outline' : 'destructive'}
      className={available === 'delete' ? 'text-destructive hover:text-destructive' : undefined}
      onClick={() => setAction(available)}>
      {t(`broadcasts.actions.${available}`)}
    </Button>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={summary?.name ?? t('broadcasts.title')}
      footer={footer}
      className="sm:max-w-xl">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : isError || !data || !summary ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('broadcasts.notFound')}</p>
      ) : (
        <div className="space-y-5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={STATUS_VARIANT[summary.status]}>{t(`broadcasts.status.${summary.status}`)}</Badge>
            <span>
              <BroadcastWhen broadcast={summary} waitingForAnother={waitingForAnother} />
            </span>
            {accountName && <span>· {accountName}</span>}
          </div>

          {summary.error && (
            <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">{summary.error}</p>
          )}

          {summary.startedAt ? (
            <section className="space-y-2">
              <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {(
                  [
                    ['sent', summary.sent],
                    ['skipped', summary.skipped],
                    ['failed', summary.failed],
                    ['notReachable', summary.notReachable],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg px-2 py-2">
                    <dd className="text-lg font-semibold">{value}</dd>
                    <dt className="text-muted-foreground text-[11px] leading-tight">{t(`broadcasts.stats.${key}`)}</dt>
                  </div>
                ))}
              </dl>
              {summary.status === 'Sending' && (
                <Progress
                  value={progress(summary)}
                  className="h-1.5"
                  aria-label={t('broadcasts.progress', { percent: progress(summary) })}
                />
              )}
              <p className="text-muted-foreground text-xs">{t('broadcasts.statsHint')}</p>
            </section>
          ) : (
            <p className="bg-muted/60 rounded-lg px-3 py-2 text-xs">{t('broadcasts.notStarted')}</p>
          )}

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">{t('broadcasts.form.to')}</h3>
            {data.tags.length === 0 ? (
              <p className="text-sm">{t('broadcasts.form.everyone')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">{t('broadcasts.form.what')}</h3>
            {summary.kind === 'flow' ? (
              <p className="flex items-center gap-1.5 text-sm">
                <Workflow className="text-muted-foreground size-4" />
                {data.flowName ?? t('broadcasts.flowRemoved')}
              </p>
            ) : (
              <div className="bg-muted/40 max-w-sm space-y-2 rounded-2xl p-2">
                {data.mediaPreviewDataUri && (
                  <img
                    src={data.mediaPreviewDataUri}
                    alt={t('broadcasts.form.image')}
                    className="max-h-40 rounded-xl"
                  />
                )}
                {data.text && (
                  <p className="px-1.5 text-sm whitespace-pre-wrap">
                    <MessageText text={data.text} />
                  </p>
                )}
                {/* The server stores only http(s) links; checked again before it becomes a link. */}
                {data.buttonTitle && data.buttonUrl && /^https?:\/\//i.test(data.buttonUrl) && (
                  <a
                    href={data.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background flex items-center justify-center gap-1 rounded-xl py-1.5 text-sm font-medium">
                    {data.buttonTitle}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </section>

          {data.failures.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold">{t('broadcasts.failures')}</h3>
              <ul className="divide-y rounded-lg border text-xs">
                {data.failures.map((f) => (
                  <li key={f.contactId} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                    <span className="font-medium">{f.name ?? (f.username ? `@${f.username}` : t('contacts.fan'))}</span>
                    <span className="text-muted-foreground">{f.error}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(o) => !o && setAction(null)}
        type={action === 'delete' ? 'danger' : 'warning'}
        title={action ? t(`broadcasts.confirm.${action}.title`) : undefined}
        description={action ? t(`broadcasts.confirm.${action}.description`) : undefined}
        confirmText={action ? t(`broadcasts.actions.${action}`) : undefined}
        isLoading={run.isPending}
        onConfirm={() => action && run.mutate(action)}
      />
    </Modal>
  );
}
