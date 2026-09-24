// Mirrors office-api/Office.Api/Features/Subscriptions/Contracts.cs (staff / moderator side).
import type { CustomerPlanTier, SubscriptionRequestStatus } from '~/types/customerSubscriptions';

export interface ModeratorSubscriptionRequest {
  id: string;
  customerId: string;
  customerEmail: string;
  customerFullName: string;
  tier: CustomerPlanTier;
  durationMonths: number;
  /** Exact transfer amount, random dirams included — the moderator matches it against the bank. */
  expectedAmount: number;
  currency: string;
  status: SubscriptionRequestStatus;
  receiptUrl: string | null;
  receiptFileName: string | null;
  /** The company card the мизоҷ says they paid to (snapshot at upload). */
  paidToBank: string | null;
  paidToCardNumber: string | null;
  createdAt: string;
  submittedAt: string | null;
  reviewedByUserName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface PendingCountResponse {
  count: number;
}

/** Payload of the "subscription_receipt" notification. */
export interface SubscriptionReceiptPayload {
  tier: CustomerPlanTier;
  amount: number;
  currency: string;
}
