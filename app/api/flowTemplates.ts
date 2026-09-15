import { apiClient } from '~/lib/client';
import type { CreateFlowRequest, FlowDetail, FlowTemplateListItem } from '~/types/flow';

export const flowTemplatesApi = {
  list: async (): Promise<FlowTemplateListItem[]> => {
    const { data } = await apiClient.get<FlowTemplateListItem[]>('/flow-templates');
    return data;
  },
  instantiate: async (channelId: string, templateId: string, payload: CreateFlowRequest): Promise<FlowDetail> => {
    const { data } = await apiClient.post<FlowDetail>(
      `/channels/${channelId}/flows/from-template/${templateId}`,
      payload
    );
    return data;
  },
};
