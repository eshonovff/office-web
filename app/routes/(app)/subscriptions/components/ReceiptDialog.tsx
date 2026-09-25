import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionRequestsApi } from '~/api/subscriptionRequests';
import { buttonVariants } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPaymentAmount } from '~/lib/customerSubscription';
import { cn } from '~/lib/utils';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';
import { useLastRequest } from './useLastRequest';

// What the upload accepts (ReceiptFileSignature on the backend). Anything else is not shown at
// all — the object URL below lives on our own origin, so only inert image/PDF types get one.
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

type ReceiptState =
  { id: string; status: 'ready'; url: string; isPdf: boolean } | { id: string; status: 'unsupported' | 'error' };

/**
 * Fetches the receipt with the moderator's token (a plain <img src> could not send it) and
 * turns it into an object URL, revoked when the dialog closes or moves to another receipt.
 */
function useReceipt(id: string | undefined): ReceiptState | { status: 'loading' } | null {
  const [state, setState] = useState<ReceiptState | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let url: string | null = null;

    subscriptionRequestsApi
      .getReceiptBlob(id)
      .then((blob) => {
        if (cancelled) return;
        const type = blob.type.split(';')[0].trim().toLowerCase();
        if (!RECEIPT_TYPES.includes(type)) {
          setState({ id, status: 'unsupported' });
          return;
        }
        url = URL.createObjectURL(new Blob([blob], { type }));
        setState({ id, status: 'ready', url, isPdf: type === 'application/pdf' });
      })
      .catch(() => {
        // apiClient has already shown the error toast.
        if (!cancelled) setState({ id, status: 'error' });
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (!id) return null;
  return state?.id === id ? state : { status: 'loading' };
}

interface ReceiptDialogProps {
  request: ModeratorSubscriptionRequest | null;
  onClose: () => void;
}

export function ReceiptDialog({ request, onClose }: ReceiptDialogProps) {
  const { t } = useTranslation('subscriptions');
  const shown = useLastRequest(request);
  const receipt = useReceipt(request?.id);

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 p-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('receipt.title')}</DialogTitle>
          {shown && (
            <DialogDescription>
              {shown.customerFullName} ·{' '}
              <span className="text-foreground font-mono font-semibold">
                {formatPaymentAmount(shown.expectedAmount)} {shown.currency}
              </span>
              {shown.paidToBank && ` · ${shown.paidToBank}`}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {receipt?.status === 'loading' && <Skeleton className="h-[60vh] w-full rounded-lg" />}
          {receipt?.status === 'error' && (
            <p className="text-destructive py-10 text-center text-sm">{t('receipt.failed')}</p>
          )}
          {receipt?.status === 'unsupported' && (
            <p className="text-destructive py-10 text-center text-sm">{t('receipt.unsupported')}</p>
          )}
          {receipt?.status === 'ready' &&
            (receipt.isPdf ? (
              <iframe src={receipt.url} title={t('receipt.title')} className="h-[65vh] w-full rounded-lg border" />
            ) : (
              <img
                src={receipt.url}
                alt={t('receipt.title')}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
            ))}
        </div>

        {receipt?.status === 'ready' && (
          <div className="flex justify-end">
            <a
              href={receipt.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
              <ExternalLink className="h-4 w-4" />
              {t('receipt.openInNewTab')}
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
