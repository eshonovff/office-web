import { CircleAlert, Clock, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { useSidebar } from '~/components/ui/sidebar';
import { daysLeft } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';

// Sidebar footer: where the customer stands (trial / paid plan / expired) and the way to
// /account/billing. Reads `access` exactly as /me computed it — no date logic of its own
// beyond turning endsAt into "N days left".
export function CustomerAccessStatus() {
  const { t } = useTranslation('customerAuth');
  const { setOpenMobile } = useSidebar();
  const access = useCustomerAuthStore((s) => s.customer?.access);

  if (!access) return null;

  const isExpired = access.status === 'Expired';
  const Icon = access.status === 'Active' ? Crown : isExpired ? CircleAlert : Clock;

  let title: string;
  let detail: string | null;
  if (access.status === 'Active') {
    title = t('billing.status.activeTitle', { tier: access.tier });
    detail = t('billing.status.until', { date: formatDate(access.endsAt) });
  } else if (access.status === 'Trial') {
    title = t('billing.status.trialTitle');
    detail = access.endsAt ? t('billing.status.daysLeft', { count: daysLeft(access.endsAt) }) : null;
  } else {
    title = t('billing.status.expiredTitle');
    detail = t('billing.status.expiredDetail');
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border p-3 group-data-[collapsible=icon]:hidden',
        isExpired ? 'border-destructive/30 bg-destructive/5' : 'bg-background'
      )}>
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 size-4 shrink-0', isExpired ? 'text-destructive' : 'text-primary')} />
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold">{title}</p>
          {detail && <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>}
        </div>
      </div>
      <Button
        size="sm"
        variant={access.status === 'Active' ? 'outline' : 'default'}
        className="w-full"
        render={<Link to="/account/billing" onClick={() => setOpenMobile(false)} />}>
        {access.status === 'Active' ? t('billing.status.extend') : t('billing.status.choosePlan')}
      </Button>
    </div>
  );
}
