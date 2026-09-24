import type { CustomerAccess } from '~/types/customerAuth';
import type { PlanLimits, SubscriptionCatalog } from '~/types/customerSubscriptions';

/**
 * The limits that apply right now — mirrors CustomerEntitlements.ResolveLimits on the backend
 * (which is what actually enforces them): the paid tier's, Pro's during the trial, null without
 * access. Only for showing "3 of 10" and disabling buttons early.
 */
export function resolvePlanLimits(
  access: CustomerAccess | null | undefined,
  catalog: SubscriptionCatalog | null | undefined
): PlanLimits | null {
  if (!access?.hasAccess || !catalog) return null;
  const tier = access.status === 'Trial' ? 'Pro' : access.tier;
  return catalog.plans.find((p) => p.tier === tier)?.limits ?? null;
}

/** Whether one more fits: a null limit is unlimited. */
export function canAddOneMore(limit: number | null, used: number): boolean {
  return limit === null || used < limit;
}
