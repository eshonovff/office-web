import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerAuthApi } from '~/api/customerAuth';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { Skeleton } from '~/components/ui/skeleton';
import { findOpenRequest } from '~/lib/customerSubscription';
import { cn } from '~/lib/utils';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import { PaymentPanel } from './components/PaymentPanel';
import { PlanPicker } from './components/PlanPicker';
import { RequestHistory } from './components/RequestHistory';
import { CUSTOMER_ME_QUERY_KEY, SUBSCRIPTION_CATALOG_QUERY_KEY, SUBSCRIPTION_REQUESTS_QUERY_KEY } from './queryKeys';

export default function BillingPage() {
  const { t } = useTranslation('customerAuth');

  // The layout loaded /me once; a moderator may approve while the customer sits on this
  // page, so re-read it here (window refocus included) and push it to the store the
  // sidebar status reads from.
  const { data: me } = useQuery({ queryKey: CUSTOMER_ME_QUERY_KEY, queryFn: customerAuthApi.me });
  useEffect(() => {
    if (me) useCustomerAuthStore.getState().setCustomer(me);
  }, [me]);

  const catalogQuery = useQuery({
    queryKey: SUBSCRIPTION_CATALOG_QUERY_KEY,
    queryFn: customerSubscriptionsApi.catalog,
  });
  const requestsQuery = useQuery({
    queryKey: SUBSCRIPTION_REQUESTS_QUERY_KEY,
    queryFn: customerSubscriptionsApi.listRequests,
  });

  // Only meaningful while the open request is AwaitingPayment — lets the customer go back
  // to the picker (a new request cancels that one on the backend).
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const catalog = catalogQuery.data;
  const requests = requestsQuery.data;

  if (!catalog || !requests) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const openRequest = findOpenRequest(requests);
  const showPicker = !openRequest || (isChangingPlan && openRequest.status === 'AwaitingPayment');

  return (
    // Wider while picking: three plan cards with feature lists don't fit a 3xl column.
    <div className={cn('mx-auto space-y-6', showPicker ? 'max-w-5xl' : 'max-w-3xl')}>
      <div>
        <h1 className="text-2xl font-bold">{t('billing.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('billing.subtitle')}</p>
      </div>

      {showPicker ? (
        <PlanPicker
          catalog={catalog}
          current={openRequest ?? undefined}
          onCreated={() => setIsChangingPlan(false)}
          onCancel={openRequest ? () => setIsChangingPlan(false) : undefined}
        />
      ) : (
        <PaymentPanel request={openRequest} catalog={catalog} onChangePlan={() => setIsChangingPlan(true)} />
      )}

      <RequestHistory requests={requests.filter((r) => r.id !== openRequest?.id)} currency={catalog.currency} />
    </div>
  );
}
