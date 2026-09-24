import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, Hourglass, Timer, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { formatCardNumber, formatCountdown, formatPaymentAmount, secondsUntil } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { SubscriptionCatalog, SubscriptionRequest } from '~/types/customerSubscriptions';
import { SUBSCRIPTION_REQUESTS_QUERY_KEY } from '../queryKeys';
import { CopyButton } from './CopyButton';
import { BankOption, PaymentCardDetails } from './PaymentCardOption';

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
  const navigate = useNavigate();
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
  const chosenCard = cards.find((c) => c.cardNumber === selectedCard) ?? null;

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

  // Ticks once a second while there is a deadline. secondsLeft is derived, not stored, so a
  // request that turns Pending (no deadline) can't leave a stale 0 behind to trigger the redirect.
  const deadline = request.status === 'AwaitingPayment' ? request.paymentDeadline : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const secondsLeft = deadline ? secondsUntil(deadline, new Date(now)) : null;

  // Time's up → back to the account home; the backend expires the request on the refetch.
  // Not mid-upload: that receipt may still land inside the backend's grace period, and if
  // it doesn't, its 409 ends the upload and this runs then.
  useEffect(() => {
    if (secondsLeft !== 0 || isUploading) return;
    toast.error(t('billing.payment.timeUp'), { id: 'payment-time-up' });
    void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_REQUESTS_QUERY_KEY });
    navigate('/account');
  }, [secondsLeft, isUploading, navigate, queryClient, t]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !chosenCard) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error(t('billing.payment.fileTooLarge'));
      return;
    }
    upload({ file, cardNumber: chosenCard.cardNumber });
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
        {/* Top-left, where "back" is looked for — a customer who changes their mind after
            seeing the amount must find the way out without scrolling past the whole form.
            Not while editing a Pending request: the backend refuses a new plan then. */}
        {!isPending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 w-fit"
            onClick={onChangePlan}
            disabled={isUploading}>
            <ArrowLeft />
            {t('billing.payment.backToPlans')}
          </Button>
        )}
        <CardTitle>{t('billing.payment.title')}</CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {secondsLeft !== null && (
          <div
            role="timer"
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3',
              secondsLeft <= 60 ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'bg-muted/50'
            )}>
            <Timer className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('billing.payment.timeLeft')}</p>
              <p className="text-muted-foreground text-xs">{t('billing.payment.timeLeftHint')}</p>
            </div>
            <span className="text-2xl font-bold tabular-nums">{formatCountdown(secondsLeft)}</span>
          </div>
        )}

        <section className="space-y-2">
          <p id="payment-bank-label" className="text-sm font-medium">
            1. {t('billing.payment.chooseBank')}
          </p>
          {cards.length === 0 ? (
            <p className="text-destructive text-sm">{t('billing.plans.noCards')}</p>
          ) : (
            <>
              <div role="radiogroup" aria-labelledby="payment-bank-label" className="grid grid-cols-2 gap-2">
                {cards.map((card) => (
                  <BankOption
                    key={card.cardNumber}
                    card={card}
                    selected={card.cardNumber === selectedCard}
                    onSelect={() => setSelectedCard(card.cardNumber)}
                  />
                ))}
              </div>
              {!chosenCard && <p className="text-muted-foreground text-sm">{t('billing.payment.chooseBankHint')}</p>}
            </>
          )}
        </section>

        {/* Amount and card number only once a bank is chosen: the customer then copies both
            from one block — "this much, to this card" — instead of picking from a list. */}
        {chosenCard && (
          <>
            <section className="space-y-2">
              <p className="text-sm font-medium">2. {t('billing.payment.step2')}</p>
              <div className="bg-muted/50 flex items-center gap-2 rounded-xl border p-4">
                <span className="text-3xl font-bold tracking-tight tabular-nums">{amount}</span>
                <span className="text-muted-foreground text-lg">{catalog.currency}</span>
                <div className="ml-auto">
                  <CopyButton value={amount} />
                </div>
              </div>
              <PaymentCardDetails card={chosenCard} />
              <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{t('billing.payment.exactAmountHint')}</span>
              </p>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium">3. {t('billing.payment.step3')}</p>
              <p className="text-muted-foreground text-xs">{t('billing.payment.receiptHint')}</p>
              <div className="flex flex-wrap gap-2">
                <input ref={inputRef} type="file" accept={RECEIPT_ACCEPT} className="hidden" onChange={handlePick} />
                <Button type="button" disabled={isUploading} onClick={() => inputRef.current?.click()}>
                  <Upload />
                  {isUploading
                    ? t('billing.payment.uploading')
                    : isPending
                      ? t('billing.payment.replaceReceipt')
                      : t('billing.payment.upload')}
                </Button>
                {isPending && (
                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isUploading}>
                    {t('billing.plans.cancel')}
                  </Button>
                )}
              </div>
            </section>
          </>
        )}

        {/* Without a chosen bank there is no step 3 to reach "cancel" from. */}
        {!chosenCard && isPending && (
          <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
            {t('billing.plans.cancel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
