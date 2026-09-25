import { Check, CircleCheck, Infinity as InfinityIcon, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '~/lib/customerSubscription';
import { cn } from '~/lib/utils';
import type { SubscriptionPlan } from '~/types/customerSubscriptions';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}

// Everything here comes from the plan's limits in the catalog (Subscriptions:Plans[].Limits),
// so changing a tier is a config edit, not a frontend change. The rows that are unlimited on
// every tier are still listed: "unlimited contacts" is a selling point, not noise.
export function PlanCard({ plan, currency, selected, onSelect }: PlanCardProps) {
  const { t } = useTranslation('customerAuth');
  const { limits } = plan;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-ring relative flex flex-col rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-2',
        selected ? 'border-primary bg-primary/5 ring-primary ring-1' : 'hover:bg-muted/50'
      )}>
      {selected && <CircleCheck className="text-primary absolute top-3 right-3 size-5" />}
      <p className="text-lg font-semibold">{plan.tier}</p>
      {/* Two lines reserved on md+ (three cards in a row), so prices line up across cards. */}
      <p className="text-muted-foreground mt-0.5 text-sm md:min-h-10">{t(`billing.plans.tagline.${plan.tier}`)}</p>
      <p className="mt-3 text-2xl font-bold">
        {formatPrice(plan.monthlyPrice, currency)}
        <span className="text-muted-foreground text-sm font-normal"> {t('billing.plans.perMonth')}</span>
      </p>

      <ul className="mt-4 w-full divide-y border-t text-sm">
        <FeatureRow
          label={t('billing.plans.features.automations')}
          value={<Count value={limits.activeAutomations} />}
        />
        <FeatureRow
          label={t('billing.plans.features.accounts')}
          hint={t('billing.plans.features.accountsHint')}
          value={<Count value={limits.accounts} />}
        />
        <FeatureRow label={t('billing.plans.features.teamMembers')} value={<Count value={limits.teamMembers} />} />
        <FeatureRow label={t('billing.plans.features.contacts')} value={<Count value={null} />} />
        <FeatureRow label={t('billing.plans.features.broadcasts')} value={<Count value={null} />} />
        <FeatureRow
          label={t('billing.plans.features.whatsAppBroadcasts')}
          value={
            limits.whatsAppBroadcasts ? (
              <Check className="text-primary size-4" aria-label={t('billing.plans.features.included')} />
            ) : (
              <Minus className="text-muted-foreground size-4" aria-label={t('billing.plans.features.notIncluded')} />
            )
          }
        />
      </ul>
    </button>
  );
}

function FeatureRow({ label, hint, value }: { label: string; hint?: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums">{value}</span>
    </li>
  );
}

/** A limit from the catalog: null = unlimited. */
function Count({ value }: { value: number | null }) {
  const { t } = useTranslation('customerAuth');
  return value === null ? (
    <InfinityIcon className="size-4" aria-label={t('billing.plans.features.unlimited')} />
  ) : (
    value
  );
}
