// Mirrors office-api/Office.Api/Features/Subscriptions/Contracts.cs (customer side).

export type CustomerPlanTier = 'Pro' | 'Creator' | 'Premium';

export type SubscriptionRequestStatus = 'AwaitingPayment' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface SubscriptionPlan {
  tier: CustomerPlanTier;
  monthlyPrice: number;
}

export interface PaymentCard {
  bank: string;
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
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface CreateSubscriptionRequestPayload {
  tier: CustomerPlanTier;
  months: number;
}
