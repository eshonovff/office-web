import { Check, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useIsMobile } from '~/hooks/use-mobile';
import { formatPaymentAmount } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import type { SubscriptionRequestStatus } from '~/types/customerSubscriptions';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';

const STATUS_VARIANT: Record<SubscriptionRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  AwaitingPayment: 'outline',
  Pending: 'secondary',
  Approved: 'default',
  Rejected: 'destructive',
  Cancelled: 'outline',
  Expired: 'outline',
};

/** "5058270285104567" → "•••• 4567": enough to know which bank app to open. */
function lastFour(cardNumber: string): string {
  return `•••• ${cardNumber.replace(/\s+/g, '').slice(-4)}`;
}

interface RowHandlers {
  onViewReceipt: (request: ModeratorSubscriptionRequest) => void;
  onApprove: (request: ModeratorSubscriptionRequest) => void;
  onReject: (request: ModeratorSubscriptionRequest) => void;
}

interface RequestsTableProps extends RowHandlers {
  requests: ModeratorSubscriptionRequest[];
  /** The "all" tab mixes statuses; the others are one status each. */
  showStatus: boolean;
  /** Who decided and when (and why, for a rejection) — not in the queue, where nobody has yet. */
  showReview: boolean;
}

function Amount({ request }: { request: ModeratorSubscriptionRequest }) {
  return (
    <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
      {formatPaymentAmount(request.expectedAmount)} {request.currency}
    </span>
  );
}

function StatusBadge({ status }: { status: SubscriptionRequestStatus }) {
  const { t } = useTranslation('subscriptions');
  return <Badge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}

function ReviewInfo({ request }: { request: ModeratorSubscriptionRequest }) {
  if (!request.reviewedAt) return <span className="text-muted-foreground">—</span>;
  return (
    <>
      <p className="text-muted-foreground text-xs">
        {request.reviewedByUserName} · {formatDate(request.reviewedAt, true)}
      </p>
      {request.status === 'Rejected' && request.reviewNote && (
        <p className="text-destructive mt-0.5 text-xs break-words whitespace-normal">{request.reviewNote}</p>
      )}
    </>
  );
}

function RowActions({
  request,
  onViewReceipt,
  onApprove,
  onReject,
}: RowHandlers & { request: ModeratorSubscriptionRequest }) {
  const { t } = useTranslation('subscriptions');
  return (
    <>
      {request.receiptUrl && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onViewReceipt(request)}>
          <FileText className="h-4 w-4" />
          {t('actions.receipt')}
        </Button>
      )}
      {request.status === 'Pending' && (
        <>
          <Button size="sm" className="gap-1.5" onClick={() => onApprove(request)}>
            <Check className="h-4 w-4" />
            {t('actions.approve')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
            onClick={() => onReject(request)}>
            <X className="h-4 w-4" />
            {t('actions.reject')}
          </Button>
        </>
      )}
    </>
  );
}

// A table on a desktop; on a phone — where a moderator may well approve from — one card per
// request, so the amount and the buttons are never scrolled off to the side.
export function RequestsTable({ requests, showStatus, showReview, ...handlers }: RequestsTableProps) {
  const { t } = useTranslation('subscriptions');
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ul className="space-y-2">
        {requests.map((request) => (
          <li key={request.id} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{request.customerFullName}</p>
                <p className="text-muted-foreground truncate text-xs">{request.customerEmail}</p>
              </div>
              {showStatus && <StatusBadge status={request.status} />}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span>{t('plan', { tier: request.tier, count: request.durationMonths })}</span>
              <Amount request={request} />
            </div>
            <p className="text-muted-foreground text-xs">
              {request.paidToBank && request.paidToCardNumber && (
                <>
                  {request.paidToBank} <span className="font-mono">{lastFour(request.paidToCardNumber)}</span> ·{' '}
                </>
              )}
              {formatDate(request.submittedAt ?? request.createdAt, true)}
            </p>
            {showReview && (
              <div>
                <ReviewInfo request={request} />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <RowActions request={request} {...handlers} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.customer')}</TableHead>
            <TableHead>{t('columns.plan')}</TableHead>
            <TableHead className="text-right">{t('columns.amount')}</TableHead>
            <TableHead>{t('columns.payment')}</TableHead>
            {(showStatus || showReview) && (
              <TableHead>{showStatus ? t('columns.status') : t('columns.review')}</TableHead>
            )}
            <TableHead>
              <span className="sr-only">{t('columns.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="max-w-56">
                <p className="truncate font-medium">{request.customerFullName}</p>
                <p className="text-muted-foreground truncate text-xs" title={request.customerEmail}>
                  {request.customerEmail}
                </p>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {t('plan', { tier: request.tier, count: request.durationMonths })}
              </TableCell>
              <TableCell className="text-right">
                <Amount request={request} />
              </TableCell>
              {/* Where and when the money went, in one column — the actions must fit at 1280px. */}
              <TableCell className="whitespace-nowrap">
                {request.paidToBank && request.paidToCardNumber ? (
                  <p>
                    {request.paidToBank}{' '}
                    <span className="text-muted-foreground font-mono text-xs">
                      {lastFour(request.paidToCardNumber)}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {formatDate(request.submittedAt ?? request.createdAt, true)}
                </p>
              </TableCell>
              {/* Status and review share a column (badge above, who/when/why below) — again for width. */}
              {(showStatus || showReview) && (
                <TableCell className="max-w-56 space-y-1">
                  {showStatus && <StatusBadge status={request.status} />}
                  {showReview && (!showStatus || request.reviewedAt) && <ReviewInfo request={request} />}
                </TableCell>
              )}
              <TableCell>
                <div className="flex justify-end gap-1.5">
                  <RowActions request={request} {...handlers} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
