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

/**
 * The one request still in flight (the backend keeps at most one: a new request cancels an
 * AwaitingPayment one, and is refused while one is Pending).
 */
export function findOpenRequest(requests: SubscriptionRequest[]): SubscriptionRequest | null {
  return requests.find((r) => r.status === 'AwaitingPayment' || r.status === 'Pending') ?? null;
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
