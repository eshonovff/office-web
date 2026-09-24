import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Hourglass, Upload } from 'lucide-react';
import { useRef } from 'react';
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

// Same limits as SubscriptionReceiptStorage on the backend — checked here only to fail fast
// before a 10 MB upload, the server still enforces them.
const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';
const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

// Keyed by the backend's Subscriptions:PaymentCards[].BankCode; files live in public/banks/.
const BANK_LOGOS: Record<string, string> = {
  dc: '/banks/dc.svg',
  alif: '/banks/alif.svg',
};

interface PaymentPanelProps {
  request: SubscriptionRequest;
  catalog: SubscriptionCatalog;
  onChangePlan: () => void;
}

export function PaymentPanel({ request, catalog, onChangePlan }: PaymentPanelProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const amount = formatPaymentAmount(request.expectedAmount);
  const isPending = request.status === 'Pending';

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => customerSubscriptionsApi.uploadReceipt(request.id, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_REQUESTS_QUERY_KEY });
      toast.success(t('billing.payment.uploadSuccess'));
    },
  });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error(t('billing.payment.fileTooLarge'));
      return;
    }
    upload(file);
  }

  const uploadButton = (
    <>
      <input ref={inputRef} type="file" accept={RECEIPT_ACCEPT} className="hidden" onChange={handlePick} />
      <Button
        type="button"
        variant={isPending ? 'outline' : 'default'}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}>
        <Upload />
        {isUploading
          ? t('billing.payment.uploading')
          : isPending
            ? t('billing.payment.replaceReceipt')
            : t('billing.payment.upload')}
      </Button>
    </>
  );

  const summary = t('billing.payment.summary', { tier: request.tier, count: request.durationMonths });

  if (isPending) {
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
          <div className="text-sm">
            <p className="font-medium">
              {summary} · {amount} {catalog.currency}
            </p>
            <p className="text-muted-foreground">
              {t('billing.payment.submittedAt', { date: formatDate(request.submittedAt, true) })}
            </p>
          </div>
          {uploadButton}
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
          <p className="text-sm font-medium">2. {t('billing.payment.step2')}</p>
          {catalog.paymentCards.length === 0 ? (
            <p className="text-destructive text-sm">{t('billing.plans.noCards')}</p>
          ) : (
            <ul className="space-y-2">
              {catalog.paymentCards.map((card) => (
                <li key={card.cardNumber} className="flex items-center gap-3 rounded-xl border p-3">
                  {BANK_LOGOS[card.bankCode] && (
                    // Always on white: both official logos have dark-on-light wordmarks
                    // (Alif's is #222) that vanish on the dark theme's background.
                    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white px-1.5 sm:w-20">
                      <img src={BANK_LOGOS[card.bankCode]} alt={card.bank} className="max-h-7 w-full object-contain" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{card.bank}</p>
                    <p className="font-mono text-sm font-semibold tabular-nums sm:text-base">
                      {formatCardNumber(card.cardNumber)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{card.holderName}</p>
                  </div>
                  <div className="ml-auto">
                    <CopyButton value={card.cardNumber.replace(/\s+/g, '')} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium">3. {t('billing.payment.step3')}</p>
          <p className="text-muted-foreground text-xs">{t('billing.payment.receiptHint')}</p>
          <div className="flex flex-wrap gap-2">
            {uploadButton}
            <Button type="button" variant="ghost" onClick={onChangePlan} disabled={isUploading}>
              {t('billing.payment.changePlan')}
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
