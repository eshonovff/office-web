import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { formatPaymentAmount } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import type { SubscriptionRequest, SubscriptionRequestStatus } from '~/types/customerSubscriptions';

const STATUS_VARIANT: Record<SubscriptionRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  AwaitingPayment: 'outline',
  Pending: 'secondary',
  Approved: 'default',
  Rejected: 'destructive',
  Cancelled: 'outline',
};

interface RequestHistoryProps {
  requests: SubscriptionRequest[];
  currency: string;
}

// A list, not a table — this page is mostly opened on a phone, right after paying.
export function RequestHistory({ requests, currency }: RequestHistoryProps) {
  const { t } = useTranslation('customerAuth');

  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('billing.history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t('billing.payment.summary', { tier: request.tier, count: request.durationMonths })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(request.createdAt)} · {formatPaymentAmount(request.expectedAmount)} {currency}
                  {request.paidToBank && ` · ${request.paidToBank}`}
                </p>
                {request.status === 'Rejected' && request.reviewNote && (
                  <p className="text-destructive mt-1 text-sm">
                    {t('billing.history.reason', { note: request.reviewNote })}
                  </p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[request.status]}>{t(`billing.requestStatus.${request.status}`)}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
