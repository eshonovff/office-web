import { customerCommentRulesApi } from '~/api/customerCommentRules';
import { createFlowTemplatesApi } from '~/api/flowTemplates';
import { createFlowsApi } from '~/api/flows';
import { customerApiClient } from '~/lib/customerClient';
import type { FlowBuilderApi } from '~/lib/flowBuilderApi';
import type { InstagramMediaListResult } from '~/types/commentAutomation';
import type { CustomerChannel } from '~/types/customerChannels';

// Same paths as staff, relative to /api/public — the backend scopes every one to the мизоҷ.
export const customerFlowsApi = createFlowsApi(customerApiClient);
export const customerFlowTemplatesApi = createFlowTemplatesApi(customerApiClient);

export const customerChannelsApi = {
  list: async (): Promise<CustomerChannel[]> => {
    const { data } = await customerApiClient.get<CustomerChannel[]>('/channels');
    return data;
  },
  startInstagramOAuth: async (): Promise<{ url: string }> => {
    const { data } = await customerApiClient.get<{ url: string }>('/channels/oauth/instagram/start');
    return data;
  },
  connectInstagram: async (payload: {
    connectionId: string;
    externalId: string;
    name: string;
  }): Promise<CustomerChannel> => {
    const { data } = await customerApiClient.post<CustomerChannel>('/channels/oauth/instagram/connect', payload);
    return data;
  },
  disconnect: async (id: string): Promise<void> => {
    await customerApiClient.delete(`/channels/${id}`);
  },
  listInstagramMedia: async (channelId: string, after?: string): Promise<InstagramMediaListResult> => {
    const { data } = await customerApiClient.get<InstagramMediaListResult>(`/channels/${channelId}/instagram-media`, {
      params: after ? { after } : undefined,
    });
    return data;
  },
};

export const customerFlowBuilderApi: FlowBuilderApi = {
  flows: customerFlowsApi,
  templates: customerFlowTemplatesApi,
  listInstagramMedia: customerChannelsApi.listInstagramMedia,
  dryRunRule: (channelId, payload) => customerCommentRulesApi.dryRun(channelId, payload),
  paths: { list: '/account/automations', editor: (flowId) => `/account/automations/flows/${flowId}` },
};
