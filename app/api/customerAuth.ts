import { customerApiClient, externalLoginClient } from '~/lib/customerClient';
import type { CustomerAuthMessageResponse, CustomerAuthResponse, CustomerMeResponse } from '~/types/customerAuth';
import type { CustomerLoginForm, RegisterForm, ResendCodeForm, VerifyEmailForm } from '~/validations/customerAuth';

export type ExternalAuthProvider = 'google' | 'apple';

export const customerAuthApi = {
  register: async (payload: RegisterForm): Promise<CustomerAuthMessageResponse> => {
    const { data } = await customerApiClient.post<CustomerAuthMessageResponse>('/auth/register', payload);
    return data;
  },
  verifyEmail: async (payload: VerifyEmailForm): Promise<CustomerAuthResponse> => {
    const { data } = await customerApiClient.post<CustomerAuthResponse>('/auth/verify-email', payload);
    return data;
  },
  resendCode: async (payload: ResendCodeForm): Promise<CustomerAuthMessageResponse> => {
    const { data } = await customerApiClient.post<CustomerAuthMessageResponse>('/auth/resend-code', payload);
    return data;
  },
  login: async (payload: CustomerLoginForm): Promise<CustomerAuthResponse> => {
    const { data } = await customerApiClient.post<CustomerAuthResponse>('/auth/login', payload);
    return data;
  },
  logout: async (): Promise<void> => {
    await customerApiClient.post('/auth/logout');
  },
  me: async (): Promise<CustomerMeResponse> => {
    const { data } = await customerApiClient.get<CustomerMeResponse>('/auth/me');
    return data;
  },
  externalLogin: async (provider: ExternalAuthProvider, idToken: string): Promise<CustomerAuthResponse> => {
    const { data } = await externalLoginClient.post<CustomerAuthResponse>(`/auth/${provider}`, undefined, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return data;
  },
};
