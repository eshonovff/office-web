export interface CustomerMeResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
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
