import { describe, expect, it } from 'vitest';
import { canAddOneMore, resolvePlanLimits } from '~/lib/customerPlan';
import type { CustomerAccess } from '~/types/customerAuth';
import type { SubscriptionCatalog } from '~/types/customerSubscriptions';

const limits = (accounts: number | null, activeAutomations: number | null) => ({
  accounts,
  activeAutomations,
  teamMembers: null,
  whatsAppBroadcasts: false,
});

const catalog: SubscriptionCatalog = {
  currency: 'TJS',
  trialDays: 7,
  paymentCards: [],
  plans: [
    { tier: 'Pro', monthlyPrice: 200, limits: limits(1, 10), prices: [] },
    { tier: 'Creator', monthlyPrice: 450, limits: limits(2, null), prices: [] },
  ],
};

const access = (status: CustomerAccess['status'], tier: CustomerAccess['tier'] = null): CustomerAccess => ({
  status,
  tier,
  endsAt: '2026-10-01T00:00:00Z',
  hasAccess: status !== 'Expired',
});

describe('resolvePlanLimits', () => {
  it('gives the trial Pro limits', () => {
    expect(resolvePlanLimits(access('Trial'), catalog)).toEqual(limits(1, 10));
  });

  it("gives an active plan its own tier's limits", () => {
    expect(resolvePlanLimits(access('Active', 'Creator'), catalog)).toEqual(limits(2, null));
  });

  it('gives nothing without access, or before the catalog loaded', () => {
    expect(resolvePlanLimits(access('Expired', 'Pro'), catalog)).toBeNull();
    expect(resolvePlanLimits(access('Trial'), undefined)).toBeNull();
  });
});

describe('canAddOneMore', () => {
  it('respects the limit, null being unlimited', () => {
    expect(canAddOneMore(10, 9)).toBe(true);
    expect(canAddOneMore(10, 10)).toBe(false);
    expect(canAddOneMore(null, 500)).toBe(true);
  });
});
