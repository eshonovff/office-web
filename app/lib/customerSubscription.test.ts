import { describe, expect, it } from 'vitest';
import {
  daysLeft,
  findOpenRequest,
  formatCardNumber,
  formatCountdown,
  formatPaymentAmount,
  formatPrice,
  secondsUntil,
} from '~/lib/customerSubscription';
import type { SubscriptionRequest, SubscriptionRequestStatus } from '~/types/customerSubscriptions';

const now = new Date('2026-09-24T12:00:00Z');

function request(
  id: string,
  status: SubscriptionRequestStatus,
  paymentDeadline: string | null = null
): SubscriptionRequest {
  return {
    id,
    tier: 'Pro',
    durationMonths: 1,
    expectedAmount: 200.37,
    status,
    hasReceipt: false,
    paidToBank: null,
    paidToCardNumber: null,
    createdAt: '2026-09-24T10:00:00Z',
    paymentDeadline,
    submittedAt: null,
    reviewedAt: null,
    reviewNote: null,
  };
}

describe('daysLeft', () => {
  it('counts whole days', () => {
    expect(daysLeft('2026-10-01T12:00:00Z', now)).toBe(7);
  });

  it('rounds a partial day up, so a few hours left still reads as 1 day', () => {
    expect(daysLeft('2026-09-24T15:00:00Z', now)).toBe(1);
  });

  it('is 0, never negative, once the end has passed', () => {
    expect(daysLeft('2026-09-20T12:00:00Z', now)).toBe(0);
  });
});

describe('findOpenRequest', () => {
  it('returns the request awaiting payment or review', () => {
    const requests = [request('a', 'Cancelled'), request('b', 'Pending'), request('c', 'Approved')];
    expect(findOpenRequest(requests)?.id).toBe('b');
  });

  it('treats AwaitingPayment as open while its deadline is ahead', () => {
    expect(findOpenRequest([request('a', 'AwaitingPayment', '2026-09-24T12:03:00Z')], now)?.id).toBe('a');
  });

  it('drops an AwaitingPayment whose deadline has passed, before the backend marks it Expired', () => {
    expect(findOpenRequest([request('a', 'AwaitingPayment', '2026-09-24T11:59:00Z')], now)).toBeNull();
  });

  it('returns null when everything is decided', () => {
    const requests = [
      request('a', 'Approved'),
      request('b', 'Rejected'),
      request('c', 'Cancelled'),
      request('d', 'Expired'),
    ];
    expect(findOpenRequest(requests, now)).toBeNull();
  });
});

describe('secondsUntil', () => {
  it('counts down whole seconds, rounding a partial one up', () => {
    expect(secondsUntil('2026-09-24T12:05:00Z', now)).toBe(300);
    expect(secondsUntil('2026-09-24T12:00:00.200Z', now)).toBe(1);
  });

  it('is 0 once the deadline has passed', () => {
    expect(secondsUntil('2026-09-24T11:59:00Z', now)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('formats as mm:ss', () => {
    expect(formatCountdown(299)).toBe('04:59');
    expect(formatCountdown(60)).toBe('01:00');
    expect(formatCountdown(0)).toBe('00:00');
  });
});

describe('formatPaymentAmount', () => {
  it('always shows two dirams digits', () => {
    expect(formatPaymentAmount(200.4)).toBe('200.40');
    expect(formatPaymentAmount(600)).toBe('600.00');
    expect(formatPaymentAmount(200.37)).toBe('200.37');
  });
});

describe('formatPrice', () => {
  it('drops .00 from whole prices', () => {
    expect(formatPrice(600, 'TJS')).toBe('600 TJS');
  });

  it('keeps two digits for fractional prices', () => {
    expect(formatPrice(99.5, 'TJS')).toBe('99.50 TJS');
  });
});

describe('formatCardNumber', () => {
  it('groups the digits by four', () => {
    expect(formatCardNumber('1234567812345678')).toBe('1234 5678 1234 5678');
  });

  it('normalises a number that was configured with its own spacing', () => {
    expect(formatCardNumber('1234 5678  1234 5678')).toBe('1234 5678 1234 5678');
  });
});
