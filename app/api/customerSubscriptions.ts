import { customerApiClient } from '~/lib/customerClient';
import { appendToFormData } from '~/lib/form-data';
import type {
  CreateSubscriptionRequestPayload,
  SubscriptionCatalog,
  SubscriptionRequest,
} from '~/types/customerSubscriptions';

const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' };

export const customerSubscriptionsApi = {
  catalog: async (): Promise<SubscriptionCatalog> => {
    const { data } = await customerApiClient.get<SubscriptionCatalog>('/subscriptions/catalog');
    return data;
  },
  listRequests: async (): Promise<SubscriptionRequest[]> => {
    const { data } = await customerApiClient.get<SubscriptionRequest[]>('/subscriptions/requests');
    return data;
  },
  createRequest: async (payload: CreateSubscriptionRequestPayload): Promise<SubscriptionRequest> => {
    const { data } = await customerApiClient.post<SubscriptionRequest>('/subscriptions/requests', payload);
    return data;
  },
  uploadReceipt: async (id: string, file: File, cardNumber: string): Promise<SubscriptionRequest> => {
    const { data } = await customerApiClient.post<SubscriptionRequest>(
      `/subscriptions/requests/${id}/receipt`,
      appendToFormData({ file, cardNumber }),
      { headers: MULTIPART_HEADERS }
    );
    return data;
  },
};
