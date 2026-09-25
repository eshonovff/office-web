import { apiClient } from '~/lib/client';
import type { SubscriptionRequestStatus } from '~/types/customerSubscriptions';
import type { ModeratorSubscriptionRequest, PendingCountResponse } from '~/types/subscriptionRequests';

export const subscriptionRequestsApi = {
  /** No status → every request, newest first. Pending comes oldest first (the queue order). */
  list: async (status?: SubscriptionRequestStatus): Promise<ModeratorSubscriptionRequest[]> => {
    const { data } = await apiClient.get<ModeratorSubscriptionRequest[]>('/subscription-requests', {
      params: status ? { status } : undefined,
    });
    return data;
  },
  pendingCount: async (): Promise<number> => {
    const { data } = await apiClient.get<PendingCountResponse>('/subscription-requests/pending-count');
    return data.count;
  },
  getReceiptBlob: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/subscription-requests/${id}/receipt`, { responseType: 'blob' });
    return data;
  },
  approve: async (id: string): Promise<ModeratorSubscriptionRequest> => {
    const { data } = await apiClient.post<ModeratorSubscriptionRequest>(`/subscription-requests/${id}/approve`);
    return data;
  },
  reject: async (id: string, note: string): Promise<ModeratorSubscriptionRequest> => {
    const { data } = await apiClient.post<ModeratorSubscriptionRequest>(`/subscription-requests/${id}/reject`, {
      note,
    });
    return data;
  },
};

/** Shared by the page, the sidebar badge and the realtime hook — invalidate `all` to refresh every one. */
export const subscriptionRequestKeys = {
  all: ['subscription-requests'] as const,
  list: (status: SubscriptionRequestStatus | undefined) => ['subscription-requests', 'list', status ?? 'all'] as const,
  pendingCount: ['subscription-requests', 'pending-count'] as const,
};
