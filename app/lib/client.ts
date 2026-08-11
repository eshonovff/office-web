import axios, { type InternalAxiosRequestConfig } from "axios";
import i18next from "i18next";
import { toast } from "sonner";
import { getQueryClient } from "~/lib/query-client";
import { useAuthStore } from "~/store/useAuthStore";
import type { RefreshResponse } from "~/types/auth";

const baseURL = (import.meta.env.VITE_API_URL || "") + "/api";
const originBaseURL = import.meta.env.VITE_API_URL || "";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const originClient = axios.create({
  baseURL: originBaseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({ baseURL, withCredentials: true });

// Concurrent callers (the bootstrap loader and, moments later, the 401
// interceptor below) share this one in-flight call instead of each firing
// their own /auth/refresh.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>("/auth/refresh")
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const ERROR_MESSAGES: Record<number, string> = {
  400: "errors.badRequest",
  403: "errors.forbidden",
  404: "errors.notFound",
  409: "errors.conflict",
  422: "errors.validation",
  429: "errors.tooManyRequests",
  500: "errors.serverError",
  502: "errors.badGateway",
  503: "errors.serviceUnavailable",
};

const SILENT_URLS = ["/auth/login"];

const isSilent = (url?: string): boolean => SILENT_URLS.some((silent) => url?.includes(silent));

function withAuthorization(config: InternalAxiosRequestConfig) {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

apiClient.interceptors.request.use(withAuthorization);
originClient.interceptors.request.use(withAuthorization);

// ─── 401 → single in-flight refresh, queued requests replay after ─────────

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshWaiters.forEach((resolve) => resolve(token));
  refreshWaiters = [];
}

function logout() {
  useAuthStore.getState().clear();
  getQueryClient().clear();
  window.location.href = "/login";
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error.response?.status;
    const requestUrl: string | undefined = error.config?.url;
    const config = error.config as RetriableConfig | undefined;

    if (status === 401 && config && !config._retry && !isSilent(requestUrl)) {
      config._retry = true;

      if (isRefreshing) {
        // A refresh is already in flight — queue this request and replay it
        // (or fail it) once that refresh settles.
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            config.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(config));
          });
        });
      }

      isRefreshing = true;
      try {
        const accessToken = await refreshAccessToken();
        onRefreshed(accessToken);
        config.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        onRefreshed(null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isSilent(requestUrl)) {
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error(i18next.t("errors.noConnection", { ns: "common" }));
      return Promise.reject(error);
    }

    const translationKey = status ? ERROR_MESSAGES[status] : undefined;
    const translatedMessage = translationKey ? i18next.t(translationKey, { ns: "common" }) : undefined;

    // Server messages (ASP.NET ProblemDetails `detail`/`title`) are not localized —
    // only fall back to them for status codes we have no mapped translation for.
    const serverMessage: string | undefined = error.response.data?.detail || error.response.data?.title;

    const message = translatedMessage || serverMessage || i18next.t("errors.unknown", { ns: "common" });

    // Keyed by request so retries of the same failing endpoint (TanStack
    // Query's automatic retry, or several queries hitting it at once) update
    // one toast in place instead of stacking a new one per attempt.
    toast.error(message, { id: requestUrl ?? message });

    return Promise.reject(error);
  },
);
