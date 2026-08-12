import { QueryClient, keepPreviousData } from "@tanstack/react-query";

const NO_RETRY_STATUSES = new Set([400, 401, 403, 404]);
const MAX_RETRIES = 2;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  // No response at all = network/CORS failure — worth a couple of retries,
  // same as a 5xx. A response with a 4xx status is the server telling us the
  // request itself is wrong; retrying it just repeats the same failure.
  if (status && NO_RETRY_STATUSES.has(status)) return false;
  return failureCount < MAX_RETRIES;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: shouldRetry,
        // Keep showing the previous page/filter results while the next request
        // is in flight — paginated tables stay on screen instead of flashing
        // skeletons. First load is unaffected (no previous data to show).
        placeholderData: keepPreviousData,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
