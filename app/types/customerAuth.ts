import type { CustomerPlanTier } from '~/types/customerSubscriptions';

export type CustomerAccessStatus = 'Trial' | 'Active' | 'Expired';

// Computed by the backend (CustomerAccessResolver) on every /me — never derive it here.
export interface CustomerAccess {
  status: CustomerAccessStatus;
  tier: CustomerPlanTier | null;
  endsAt: string | null;
  hasAccess: boolean;
}

export interface CustomerMeResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  access: CustomerAccess;
}

export interface CustomerAuthResponse {
  accessToken: string;
  customer: CustomerMeResponse;
}

export interface CustomerAuthMessageResponse {
  message: string;
}

export interface CustomerRefreshResponse {
  accessToken: string;
}
