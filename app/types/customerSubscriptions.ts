// Mirrors office-api/Office.Api/Features/Subscriptions/Contracts.cs (customer side).

export type CustomerPlanTier = 'Pro' | 'Creator' | 'Premium';

export type SubscriptionRequestStatus =
  'AwaitingPayment' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Expired';

export interface SubscriptionPlan {
  tier: CustomerPlanTier;
  monthlyPrice: number;
}

export interface PaymentCard {
  bank: string;
  /** "dc", "alif", … — maps to a logo in BANK_LOGOS; unknown codes just show no logo. */
  bankCode: string;
  cardNumber: string;
  holderName: string;
}

export interface SubscriptionCatalog {
  currency: string;
  trialDays: number;
  durationMonths: number[];
  plans: SubscriptionPlan[];
  paymentCards: PaymentCard[];
}

export interface SubscriptionRequest {
  id: string;
  tier: CustomerPlanTier;
  durationMonths: number;
  expectedAmount: number;
  status: SubscriptionRequestStatus;
  hasReceipt: boolean;
  /** The company card the customer chose when uploading the receipt (snapshot). */
  paidToBank: string | null;
  paidToCardNumber: string | null;
  createdAt: string;
  /** AwaitingPayment only: pay and upload the receipt before this, or the request expires. */
  paymentDeadline: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface CreateSubscriptionRequestPayload {
  tier: CustomerPlanTier;
  months: number;
}
