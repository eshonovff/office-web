import { apiClient } from '~/lib/client';
import type { AutomationListItem, AutomationSort } from '~/types/automation';

export interface ListAutomationsParams {
  channelId?: string | null;
  search?: string;
  sort?: AutomationSort;
}

export const automationsApi = {
  list: async (params: ListAutomationsParams): Promise<AutomationListItem[]> => {
    const { data } = await apiClient.get<AutomationListItem[]>('/automations', {
      params: {
        channelId: params.channelId || undefined,
        search: params.search || undefined,
        sort: params.sort || undefined,
      },
    });
    return data;
  },
};
