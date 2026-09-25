import type { AxiosInstance } from 'axios';
import { apiClient } from '~/lib/client';
import type { CreateFlowRequest, FlowDetail, FlowTemplateListItem } from '~/types/flow';

export function createFlowTemplatesApi(client: AxiosInstance) {
  return {
    list: async (): Promise<FlowTemplateListItem[]> => {
      const { data } = await client.get<FlowTemplateListItem[]>('/flow-templates');
      return data;
    },
    instantiate: async (channelId: string, templateId: string, payload: CreateFlowRequest): Promise<FlowDetail> => {
      const { data } = await client.post<FlowDetail>(
        `/channels/${channelId}/flows/from-template/${templateId}`,
        payload
      );
      return data;
    },
  };
}

export type FlowTemplatesApi = ReturnType<typeof createFlowTemplatesApi>;

export const flowTemplatesApi = createFlowTemplatesApi(apiClient);
