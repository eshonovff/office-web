import { QueryClient, keepPreviousData } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
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
