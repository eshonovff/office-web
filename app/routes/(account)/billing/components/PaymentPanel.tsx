import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Hourglass, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { formatCardNumber, formatPaymentAmount } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import type { SubscriptionCatalog, SubscriptionRequest } from '~/types/customerSubscriptions';
import { SUBSCRIPTION_REQUESTS_QUERY_KEY } from '../queryKeys';
import { CopyButton } from './CopyButton';
import { PaymentCardOption } from './PaymentCardOption';

// Same limits as SubscriptionReceiptStorage on the backend — checked here only to fail fast
// before a 10 MB upload, the server still enforces them.
const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';
const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

interface PaymentPanelProps {
  request: SubscriptionRequest;
  catalog: SubscriptionCatalog;
  onChangePlan: () => void;
}

export function PaymentPanel({ request, catalog, onChangePlan }: PaymentPanelProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const cards = catalog.paymentCards;
  // The receipt is useless to a moderator without knowing which bank's history to search —
  // so a card must be chosen before upload. A single card is chosen for the customer.
  const [selectedCard, setSelectedCard] = useState<string | null>(
    request.paidToCardNumber ?? (cards.length === 1 ? cards[0].cardNumber : null)
  );
  // A Pending request shows a compact "under review" card; this reopens the steps to fix
  // the receipt or the chosen card (the backend accepts re-uploads until a decision).
  const [isEditing, setIsEditing] = useState(false);

  const amount = formatPaymentAmount(request.expectedAmount);
  const isPending = request.status === 'Pending';

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: ({ file, cardNumber }: { file: File; cardNumber: string }) =>
      customerSubscriptionsApi.uploadReceipt(request.id, file, cardNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_REQUESTS_QUERY_KEY });
      setIsEditing(false);
      toast.success(t('billing.payment.uploadSuccess'));
    },
  });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedCard) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error(t('billing.payment.fileTooLarge'));
      return;
    }
    upload({ file, cardNumber: selectedCard });
  }

  const summary = t('billing.payment.summary', { tier: request.tier, count: request.durationMonths });

  if (isPending && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="text-primary size-5" />
            {t('billing.payment.pendingTitle')}
          </CardTitle>
          <CardDescription>{t('billing.payment.pendingDetail')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-0.5 text-sm">
            <p className="font-medium">
              {summary} · {amount} {catalog.currency}
            </p>
            {request.paidToBank && request.paidToCardNumber && (
              <p className="text-muted-foreground">
                {t('billing.payment.paidTo', {
                  bank: request.paidToBank,
                  card: formatCardNumber(request.paidToCardNumber),
                })}
              </p>
            )}
            <p className="text-muted-foreground">
              {t('billing.payment.submittedAt', { date: formatDate(request.submittedAt, true) })}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            {t('billing.payment.editReceipt')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('billing.payment.title')}</CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium">1. {t('billing.payment.step1')}</p>
          <div className="bg-muted/50 flex items-center gap-2 rounded-xl border p-4">
            <span className="text-3xl font-bold tracking-tight tabular-nums">{amount}</span>
            <span className="text-muted-foreground text-lg">{catalog.currency}</span>
            <div className="ml-auto">
              <CopyButton value={amount} />
            </div>
          </div>
          <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t('billing.payment.exactAmountHint')}</span>
          </p>
        </section>

        <section className="space-y-2">
          <p id="payment-card-label" className="text-sm font-medium">
            2. {t('billing.payment.step2')}
          </p>
          {cards.length === 0 ? (
            <p className="text-destructive text-sm">{t('billing.plans.noCards')}</p>
          ) : (
            <div role="radiogroup" aria-labelledby="payment-card-label" className="space-y-2">
              {cards.map((card) => (
                <PaymentCardOption
                  key={card.cardNumber}
                  card={card}
                  selected={card.cardNumber === selectedCard}
                  onSelect={() => setSelectedCard(card.cardNumber)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium">3. {t('billing.payment.step3')}</p>
          <p className="text-muted-foreground text-xs">{t('billing.payment.receiptHint')}</p>
          {!selectedCard && cards.length > 0 && (
            <p className="text-destructive text-sm">{t('billing.payment.selectCardFirst')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept={RECEIPT_ACCEPT} className="hidden" onChange={handlePick} />
            <Button type="button" disabled={!selectedCard || isUploading} onClick={() => inputRef.current?.click()}>
              <Upload />
              {isUploading
                ? t('billing.payment.uploading')
                : isPending
                  ? t('billing.payment.replaceReceipt')
                  : t('billing.payment.upload')}
            </Button>
            {isPending ? (
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isUploading}>
                {t('billing.plans.cancel')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onChangePlan} disabled={isUploading}>
                {t('billing.payment.changePlan')}
              </Button>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
