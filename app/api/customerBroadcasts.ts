import { customerApiClient } from '~/lib/customerClient';
import type {
  BroadcastAudience,
  BroadcastDetail,
  BroadcastListItem,
  CreateBroadcastRequest,
} from '~/types/customerBroadcasts';

export const customerBroadcastsApi = {
  list: async (): Promise<BroadcastListItem[]> => {
    const { data } = await customerApiClient.get<BroadcastListItem[]>('/broadcasts');
    return data;
  },
  get: async (id: string): Promise<BroadcastDetail> => {
    const { data } = await customerApiClient.get<BroadcastDetail>(`/broadcasts/${id}`);
    return data;
  },
  audience: async (channelId: string, tags: string[]): Promise<BroadcastAudience> => {
    // ?tags=a&tags=b — the server reads it as a list.
    const { data } = await customerApiClient.get<BroadcastAudience>('/broadcasts/audience', {
      params: { channelId, tags },
      paramsSerializer: { indexes: null },
    });
    return data;
  },
  create: async (payload: CreateBroadcastRequest): Promise<BroadcastListItem> => {
    const { data } = await customerApiClient.post<BroadcastListItem>('/broadcasts', payload);
    return data;
  },
  cancel: async (id: string): Promise<void> => {
    await customerApiClient.post(`/broadcasts/${id}/cancel`);
  },
  remove: async (id: string): Promise<void> => {
    await customerApiClient.delete(`/broadcasts/${id}`);
  },
};

/** One root: a new, stopped or deleted broadcast refreshes the list and the open card together. */
export const customerBroadcastKeys = {
  all: ['customer-broadcasts'] as const,
  list: () => ['customer-broadcasts', 'list'] as const,
  detail: (id: string) => ['customer-broadcasts', 'detail', id] as const,
  audience: (channelId: string, tags: string[]) => ['customer-broadcasts', 'audience', channelId, tags] as const,
};
