import axios, { type InternalAxiosRequestConfig } from 'axios';
import i18next from 'i18next';
import { toast } from 'sonner';
import { isSessionRejected, withCrossTabLock } from '~/lib/authFailure';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerRefreshResponse } from '~/types/customerAuth';

// Deliberately its own axios instance, not a parameterized apiClient — customer requests
// carry a different bearer token (useCustomerAuthStore, signed with a different backend key),
// a different refresh cookie (customer_refresh_token), and a 401 here must never trigger the
// staff logout()/redirect-to-/login in client.ts.
const baseURL = (import.meta.env.VITE_API_URL || '') + '/api/public';

export const customerApiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// /auth/google and /auth/apple authenticate via the PROVIDER's ID token as the bearer
// token, not our own session — customerApiClient's request interceptor would clobber that
// header with our stored access token (if any) before the request even leaves the browser,
// so this bypasses it entirely with no interceptors of its own.
export const externalLoginClient = axios.create({ baseURL, withCredentials: true });

const refreshClient = axios.create({ baseURL, withCredentials: true });

let refreshPromise: Promise<string> | null = null;

export function refreshCustomerAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = withCrossTabLock('office-customer-refresh', () =>
      refreshClient.post<CustomerRefreshResponse>('/auth/refresh')
    )
      .then(({ data }) => {
        useCustomerAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// These forms all show their own inline error — no duplicate toast on top.
const SILENT_URLS = ['/auth/register', '/auth/verify-email', '/auth/resend-code', '/auth/login'];
const isSilent = (url?: string): boolean => SILENT_URLS.some((silent) => url?.includes(silent));

customerApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useCustomerAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshWaiters.forEach((resolve) => resolve(token));
  refreshWaiters = [];
}

function customerLogout() {
  useCustomerAuthStore.getState().clear();
  window.location.href = '/account/login';
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

customerApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error.response?.status;
    const requestUrl: string | undefined = error.config?.url;
    const config = error.config as RetriableConfig | undefined;

    if (status === 401 && config && !config._retry && !isSilent(requestUrl)) {
      config._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            config.headers.Authorization = `Bearer ${token}`;
            resolve(customerApiClient(config));
          });
        });
      }

      isRefreshing = true;
      try {
        const accessToken = await refreshCustomerAccessToken();
        onRefreshed(accessToken);
        config.headers.Authorization = `Bearer ${accessToken}`;
        return customerApiClient(config);
      } catch (refreshError) {
        onRefreshed(null);
        // Same rule as the staff client: only a refused refresh ends the session.
        if (isSessionRejected(refreshError)) {
          customerLogout();
        } else {
          toast.error(i18next.t('errors.noConnection', { ns: 'common' }), { id: 'no-connection' });
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isSilent(requestUrl)) {
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error(i18next.t('errors.noConnection', { ns: 'common' }), { id: 'no-connection' });
      return Promise.reject(error);
    }

    const serverMessage: string | undefined = error.response.data?.detail || error.response.data?.title;
    const message = serverMessage || i18next.t('errors.unknown', { ns: 'common' });

    toast.error(message, { id: requestUrl ?? message });

    return Promise.reject(error);
  }
);
