import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Unplug } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerChannelsApi } from '~/api/customerFlows';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { InstagramGlyph } from '~/components/icons/InstagramGlyph';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Modal } from '~/components/shared/Modal';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { canAddOneMore, resolvePlanLimits } from '~/lib/customerPlan';
import { cn } from '~/lib/utils';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerChannel } from '~/types/customerChannels';
import { SUBSCRIPTION_CATALOG_QUERY_KEY } from '../billing/queryKeys';
import { CUSTOMER_CHANNELS_QUERY_KEY, useInstagramConnect } from './useInstagramConnect';

export default function CustomerSettingsPage() {
  const { t } = useTranslation(['customerAuth', 'common']);
  const queryClient = useQueryClient();
  const access = useCustomerAuthStore((s) => s.customer?.access);
  const connect = useInstagramConnect();
  const [toDisconnect, setToDisconnect] = useState<CustomerChannel | null>(null);

  const { data: channels, isLoading } = useQuery({
    queryKey: CUSTOMER_CHANNELS_QUERY_KEY,
    queryFn: customerChannelsApi.list,
  });
  const { data: catalog } = useQuery({
    queryKey: SUBSCRIPTION_CATALOG_QUERY_KEY,
    queryFn: customerSubscriptionsApi.catalog,
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: (id: string) => customerChannelsApi.disconnect(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY });
      setToDisconnect(null);
      toast.success(t('settings.accounts.disconnected'));
    },
  });

  const limits = resolvePlanLimits(access, catalog);
  const activeCount = channels?.filter((c) => c.isActive).length ?? 0;
  const hasAccess = access?.hasAccess === true;
  const atLimit = limits !== null && !canAddOneMore(limits.accounts, activeCount);
  const busy = connect.phase !== 'idle';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.accounts.title')}</CardTitle>
          <CardDescription>{t('settings.accounts.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccess && (
            <PlanNotice text={t('settings.accounts.noAccess')} linkText={t('billing.status.choosePlan')} />
          )}
          {hasAccess && atLimit && (
            <PlanNotice
              text={t('settings.accounts.atLimit', { count: limits?.accounts ?? 0 })}
              linkText={t('automations.upgrade')}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {limits
                ? t('settings.accounts.usage', {
                    used: activeCount,
                    limit: limits.accounts ?? t('automations.unlimited'),
                  })
                : null}
            </p>
            <Button onClick={() => void connect.begin()} disabled={!hasAccess || atLimit || busy}>
              <Plus />
              {connect.phase === 'waiting' ? t('settings.accounts.waiting') : t('settings.accounts.connect')}
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !channels?.length ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
              {t('settings.accounts.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {channels.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  canReconnect={hasAccess && !busy}
                  onReconnect={() => void connect.begin()}
                  onDisconnect={() => setToDisconnect(channel)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal
        open={connect.phase === 'accounts' || connect.phase === 'connecting'}
        onClose={connect.cancel}
        title={t('settings.accounts.pickTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={connect.cancel} disabled={connect.phase === 'connecting'}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              onClick={() => void connect.confirm()}
              disabled={!connect.selected || connect.phase === 'connecting'}>
              {connect.phase === 'connecting' ? t('settings.accounts.connecting') : t('settings.accounts.confirm')}
            </Button>
          </div>
        }>
        <div role="radiogroup" className="space-y-2">
          {connect.accounts.map((account) => (
            <button
              key={account.externalId}
              type="button"
              role="radio"
              aria-checked={connect.selected === account.externalId}
              onClick={() => connect.select(account.externalId)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                connect.selected === account.externalId
                  ? 'border-primary bg-primary/5 ring-primary ring-1'
                  : 'hover:bg-muted/50'
              )}>
              <InstagramGlyph className="size-5 shrink-0" />
              <span className="font-medium">{account.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={toDisconnect !== null}
        onOpenChange={(open) => !open && setToDisconnect(null)}
        onConfirm={() => toDisconnect && disconnect(toDisconnect.id)}
        type="danger"
        title={t('settings.accounts.disconnectTitle', { name: toDisconnect?.name ?? '' })}
        description={t('settings.accounts.disconnectDescription')}
        confirmText={t('settings.accounts.disconnect')}
        isLoading={isDisconnecting}
      />
    </div>
  );
}

function ChannelRow({
  channel,
  canReconnect,
  onReconnect,
  onDisconnect,
}: {
  channel: CustomerChannel;
  canReconnect: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useTranslation('customerAuth');
  const needsReconnect = !channel.isActive || channel.requiresReconnect;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      <InstagramGlyph className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{channel.name}</p>
        {channel.webhookSetupWarning && channel.isActive && (
          <p className="mt-0.5 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-500">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            {channel.webhookSetupWarning}
          </p>
        )}
      </div>
      <Badge variant={!channel.isActive ? 'outline' : channel.requiresReconnect ? 'destructive' : 'secondary'}>
        {!channel.isActive
          ? t('settings.accounts.statusDisconnected')
          : channel.requiresReconnect
            ? t('settings.accounts.statusReconnect')
            : t('settings.accounts.statusConnected')}
      </Badge>
      {needsReconnect && (
        <Button size="sm" variant="outline" onClick={onReconnect} disabled={!canReconnect}>
          {t('settings.accounts.reconnect')}
        </Button>
      )}
      {channel.isActive && (
        <Button size="sm" variant="ghost" onClick={onDisconnect} aria-label={t('settings.accounts.disconnect')}>
          <Unplug />
        </Button>
      )}
    </li>
  );
}

function PlanNotice({ text, linkText }: { text: string; linkText: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
      <span className="flex-1">{text}</span>
      <Button size="sm" render={<Link to="/account/billing" />}>
        {linkText}
      </Button>
    </div>
  );
}
