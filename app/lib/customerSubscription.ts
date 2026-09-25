import type { SubscriptionRequest } from '~/types/customerSubscriptions';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days until `endsAt`, rounded up — "ends in 3h" still reads as 1 day left, so the
 * banner never says 0 while access is in fact still on. Never negative.
 */
export function daysLeft(endsAt: string, now: Date = new Date()): number {
  const diff = new Date(endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

/** Whole seconds until `deadline`, rounded up so the countdown hits 0 only once it has passed. */
export function secondsUntil(deadline: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now.getTime()) / 1000));
}

/** 299 → "04:59" — the payment countdown. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The one request still in flight (the backend keeps at most one: a new request cancels an
 * AwaitingPayment one, and is refused while one is Pending). An AwaitingPayment past its
 * deadline no longer counts — the backend marks it Expired on its next read, but the page
 * must not show a finished countdown in the meantime.
 */
export function findOpenRequest(requests: SubscriptionRequest[], now: Date = new Date()): SubscriptionRequest | null {
  return (
    requests.find(
      (r) =>
        r.status === 'Pending' ||
        (r.status === 'AwaitingPayment' && (!r.paymentDeadline || secondsUntil(r.paymentDeadline, now) > 0))
    ) ?? null
  );
}

/** Transfer amounts are always shown with both dirams digits — "200.40", never "200.4". */
export function formatPaymentAmount(amount: number): string {
  return amount.toFixed(2);
}

/** List prices are usually whole somoni — "600 TJS", not "600.00 TJS". */
export function formatPrice(amount: number, currency: string): string {
  return `${Number.isInteger(amount) ? amount : amount.toFixed(2)} ${currency}`;
}

/** "1234567812345678" → "1234 5678 1234 5678", the way it is printed on the card. */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber
    .replace(/\s+/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
