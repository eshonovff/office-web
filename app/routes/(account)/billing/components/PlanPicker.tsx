import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { formatPrice } from '~/lib/customerSubscription';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerPlanTier, SubscriptionCatalog, SubscriptionRequest } from '~/types/customerSubscriptions';
import { SUBSCRIPTION_REQUESTS_QUERY_KEY } from '../queryKeys';

interface PlanPickerProps {
  catalog: SubscriptionCatalog;
  /** The AwaitingPayment request being changed — preselects its choice and enables "cancel". */
  current?: SubscriptionRequest;
  onCancel?: () => void;
  onCreated: () => void;
}

export function PlanPicker({ catalog, current, onCancel, onCreated }: PlanPickerProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const access = useCustomerAuthStore((s) => s.customer?.access);

  const [tier, setTier] = useState<CustomerPlanTier | undefined>(current?.tier ?? catalog.plans[0]?.tier);
  // Every plan offers the same durations; the current request's may have been dropped from
  // the catalog since (e.g. 12 months), so fall back to the first one offered.
  const durations = catalog.plans[0]?.prices.map((p) => p.months) ?? [];
  const [months, setMonths] = useState<number | undefined>(
    current && durations.includes(current.durationMonths) ? current.durationMonths : durations[0]
  );

  const { mutate, isPending } = useMutation({
    mutationFn: customerSubscriptionsApi.createRequest,
    // Awaited (the button stays "submitting" meanwhile): closing the picker before the list
    // refetches would briefly show the just-cancelled request's amount — and a customer
    // copying that amount pays something no moderator can match.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_REQUESTS_QUERY_KEY });
      onCreated();
    },
  });

  if (catalog.plans.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">{t('billing.plans.noPlans')}</p>
        </CardContent>
      </Card>
    );
  }

  const selectedPlan = catalog.plans.find((p) => p.tier === tier);
  const price = selectedPlan?.prices.find((p) => p.months === months);
  const hasCards = catalog.paymentCards.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('billing.plans.title')}</CardTitle>
        {/* Mirrors SubscriptionPeriodCalculator: a new period starts where the current one
            (paid plan or trial) ends, so paying early loses nothing. */}
        {access?.hasAccess && access.endsAt && (
          <CardDescription>{t('billing.plans.extendsFrom', { date: formatDate(access.endsAt) })}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {catalog.plans.map((plan) => (
            <button
              key={plan.tier}
              type="button"
              onClick={() => setTier(plan.tier)}
              aria-pressed={plan.tier === tier}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                plan.tier === tier ? 'border-primary bg-primary/5 ring-primary ring-1' : 'hover:bg-muted/50'
              )}>
              <p className="font-semibold">{plan.tier}</p>
              <p className="mt-2 text-2xl font-bold">
                {formatPrice(plan.monthlyPrice, catalog.currency)}
                <span className="text-muted-foreground text-sm font-normal"> {t('billing.plans.perMonth')}</span>
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('billing.plans.duration')}</p>
          <div className="flex flex-wrap gap-2">
            {(selectedPlan?.prices ?? []).map((p) => (
              <Button
                key={p.months}
                type="button"
                variant={p.months === months ? 'default' : 'outline'}
                aria-pressed={p.months === months}
                onClick={() => setMonths(p.months)}>
                {t('billing.plans.months', { count: p.months })}
                {p.discountPercent > 0 && (
                  <span
                    className={cn(
                      'rounded px-1 text-xs font-semibold',
                      p.months === months ? 'bg-primary-foreground/20' : 'bg-emerald-500/15 text-emerald-600'
                    )}>
                    −{p.discountPercent}%
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {!hasCards && (
          <div className="text-destructive flex items-start gap-2 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t('billing.plans.noCards')}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg">
          <span className="text-muted-foreground">{t('billing.plans.total')}: </span>
          {price && price.discountPercent > 0 && (
            <span className="text-muted-foreground mr-1.5 text-base line-through">
              {formatPrice(price.fullPrice, catalog.currency)}
            </span>
          )}
          <span className="font-bold">{price ? formatPrice(price.total, catalog.currency) : '—'}</span>
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              {t('billing.plans.backToPayment')}
            </Button>
          )}
          <Button
            type="button"
            disabled={!hasCards || !tier || !price || isPending}
            onClick={() => tier && price && mutate({ tier, months: price.months })}>
            {isPending ? t('billing.plans.submitting') : t('billing.plans.submit')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
