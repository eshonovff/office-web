import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { formatCardNumber, formatPaymentAmount } from '~/lib/customerSubscription';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';
import { useLastRequest } from './useLastRequest';

interface ApproveDialogProps {
  request: ModeratorSubscriptionRequest | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

// Approving activates a paid plan and cannot be undone, so the dialog repeats exactly what must
// have arrived — the amount to the diram and the card — for one last look at the bank app.
export function ApproveDialog({ request, isLoading, onClose, onConfirm }: ApproveDialogProps) {
  const { t } = useTranslation(['subscriptions', 'common']);
  const shown = useLastRequest(request);

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('approve.title')}</DialogTitle>
          <DialogDescription>{t('approve.checkAmount')}</DialogDescription>
        </DialogHeader>

        {shown && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-xl border p-4 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">
                {formatPaymentAmount(shown.expectedAmount)} {shown.currency}
              </p>
              {shown.paidToBank && shown.paidToCardNumber && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('approve.toCard', { bank: shown.paidToBank })}{' '}
                  <span className="text-foreground font-mono whitespace-nowrap">
                    {formatCardNumber(shown.paidToCardNumber)}
                  </span>
                </p>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {t('approve.result', { tier: shown.tier, count: shown.durationMonths, name: shown.customerFullName })}
            </p>
          </div>
        )}

        <DialogFooter className="flex-row gap-3">
          <Button type="button" variant="ghost" className="flex-1" disabled={isLoading} onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={isLoading || !shown}
            onClick={() => shown && onConfirm(shown.id)}>
            {t('approve.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
