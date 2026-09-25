import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { subscriptionRequestKeys, subscriptionRequestsApi } from '~/api/subscriptionRequests';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import type { SubscriptionRequestStatus } from '~/types/customerSubscriptions';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';
import { ApproveDialog } from './components/ApproveDialog';
import { ReceiptDialog } from './components/ReceiptDialog';
import { RejectDialog } from './components/RejectDialog';
import { RequestsTable } from './components/RequestsTable';

// The tab lives in the URL (?status=), so a reload or a shared link opens the same list.
const TABS = ['Pending', 'Approved', 'Rejected', 'all'] as const;
type Tab = (typeof TABS)[number];

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab === value) ?? 'Pending';
}

// Access is checked before this renders: the (app) layout's clientLoader redirects anyone without
// subscriptions.manage to /403 (ROUTE_PERMISSIONS), and every endpoint below checks it again.
export default function SubscriptionsPage() {
  const { t } = useTranslation('subscriptions');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('status'));
  const status: SubscriptionRequestStatus | undefined = tab === 'all' ? undefined : tab;

  const [viewing, setViewing] = useState<ModeratorSubscriptionRequest | null>(null);
  const [approving, setApproving] = useState<ModeratorSubscriptionRequest | null>(null);
  const [rejecting, setRejecting] = useState<ModeratorSubscriptionRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: subscriptionRequestKeys.list(status),
    queryFn: () => subscriptionRequestsApi.list(status),
  });

  const { data: pendingCount } = useQuery({
    queryKey: subscriptionRequestKeys.pendingCount,
    queryFn: subscriptionRequestsApi.pendingCount,
  });

  // Either way (success, or a 409 because another moderator got there first) the queue has
  // changed: refresh every list and the sidebar badge. The error toast comes from apiClient.
  const refreshAll = () => void queryClient.invalidateQueries({ queryKey: subscriptionRequestKeys.all });

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: (id: string) => subscriptionRequestsApi.approve(id),
    onSuccess: () => {
      toast.success(t('approve.success'));
      setApproving(null);
    },
    onError: () => setApproving(null),
    onSettled: refreshAll,
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => subscriptionRequestsApi.reject(id, note),
    onSuccess: () => {
      toast.success(t('reject.success'));
      setRejecting(null);
    },
    onError: () => setRejecting(null),
    onSettled: refreshAll,
  });

  function selectTab(next: Tab) {
    setSearchParams(next === 'Pending' ? {} : { status: next }, { replace: true });
  }

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <div
        role="tablist"
        aria-label={t('title')}
        className="bg-muted inline-flex max-w-full gap-1 overflow-x-auto rounded-lg p-1">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => selectTab(item)}
            className={cn(
              'focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2',
              tab === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t(`tabs.${item}`)}
            {item === 'Pending' && !!pendingCount && (
              <span className="bg-primary text-primary-foreground rounded-md px-1.5 text-xs tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {tab === 'Pending' ? t('empty.Pending') : t('empty.other')}
        </p>
      ) : (
        <RequestsTable
          requests={requests}
          showStatus={tab === 'all'}
          showReview={tab !== 'Pending'}
          onViewReceipt={setViewing}
          onApprove={setApproving}
          onReject={setRejecting}
        />
      )}

      <ReceiptDialog request={viewing} onClose={() => setViewing(null)} />
      <ApproveDialog
        request={approving}
        isLoading={isApproving}
        onClose={() => setApproving(null)}
        onConfirm={(id) => approve(id)}
      />
      <RejectDialog
        request={rejecting}
        isLoading={isRejecting}
        onClose={() => setRejecting(null)}
        onConfirm={(id, note) => reject({ id, note })}
      />
    </div>
  );
}
