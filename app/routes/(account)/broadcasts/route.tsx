import { useQuery } from '@tanstack/react-query';
import { Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { customerBroadcastKeys, customerBroadcastsApi } from '~/api/customerBroadcasts';
import { customerChannelsApi } from '~/api/customerFlows';
import { Button, buttonVariants } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { CUSTOMER_CHANNELS_QUERY_KEY } from '~/routes/(account)/settings/useInstagramConnect';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import { isOpen, sendingAccounts } from './broadcastStatus';
import { BroadcastCard } from './components/BroadcastCard';
import { BroadcastForm } from './components/BroadcastForm';
import { BroadcastList } from './components/BroadcastList';

// Broadcasts to the мизоҷ's Instagram contacts. Access is the (account) layout's мизоҷ session;
// every call goes to /api/public, where the tenant filter holds only this мизоҷ's broadcasts,
// accounts, tags and automations. Creating needs a plan (the server refuses otherwise); looking,
// stopping, cancelling and removing never do. Only Instagram for now.
export default function BroadcastsPage() {
  const { t } = useTranslation('customerAuth');
  const [searchParams, setSearchParams] = useSearchParams();
  const hasPlan = useCustomerAuthStore((s) => s.customer?.access?.hasAccess ?? false);
  const [creating, setCreating] = useState(false);

  const { data: channels } = useQuery({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY, queryFn: customerChannelsApi.list });
  const instagram = channels?.filter((c) => c.type === 'Instagram') ?? [];
  const accountNames = instagram.length > 1 ? Object.fromEntries(instagram.map((c) => [c.id, c.name])) : undefined;

  const list = useQuery({
    queryKey: customerBroadcastKeys.list(),
    queryFn: customerBroadcastsApi.list,
    // While one is waiting or sending, its numbers move — keep them fresh.
    refetchInterval: (query) => (query.state.data?.some((b) => isOpen(b.status)) ? 5000 : false),
  });

  const openId = searchParams.get('b');
  const open = (id: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('b', id);
      else next.delete('b');
      return next;
    });

  if (channels && instagram.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Send className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{t('broadcasts.noChannel')}</p>
        <Link to="/account/settings" className={buttonVariants()}>
          {t('contacts.connectInstagram')}
        </Link>
      </div>
    );
  }

  const broadcasts = list.data ?? [];
  const opened = broadcasts.find((b) => b.id === openId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('broadcasts.title')}</h1>
          <p className="text-muted-foreground max-w-xl text-sm">{t('broadcasts.subtitle')}</p>
        </div>
        <Button type="button" className="gap-1.5" disabled={!hasPlan || !channels} onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t('broadcasts.new')}
        </Button>
      </div>

      {!hasPlan && (
        <p className="bg-muted/60 rounded-lg px-3 py-2 text-xs">
          {t('broadcasts.readOnlyPlan')}{' '}
          <Link to="/account/billing" className="text-primary hover:underline">
            {t('comments.choosePlan')}
          </Link>
        </p>
      )}

      {list.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : list.isError ? (
        <p className="text-muted-foreground py-10 text-center text-sm">{t('broadcasts.loadFailed')}</p>
      ) : broadcasts.length === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed px-6 py-12 text-center">
          <Send className="text-muted-foreground mx-auto size-7" />
          <p className="text-sm font-medium">{t('broadcasts.empty')}</p>
          <p className="text-muted-foreground mx-auto max-w-md text-xs">{t('broadcasts.advice')}</p>
        </div>
      ) : (
        <BroadcastList broadcasts={broadcasts} accountNames={accountNames} onOpen={open} />
      )}

      {creating && (
        <BroadcastForm
          channels={instagram}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            open(id);
          }}
        />
      )}

      {openId && (
        <BroadcastCard
          key={openId}
          broadcastId={openId}
          accountName={opened && accountNames?.[opened.channelId]}
          waitingForAnother={!!opened && sendingAccounts(broadcasts).has(opened.channelId)}
          onClose={() => open(null)}
        />
      )}
    </div>
  );
}
