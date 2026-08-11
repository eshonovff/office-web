import { apiClient } from '~/lib/client';
import type { ChannelDetail, ChannelListItem, MyChannelListItem, SetChannelMembersRequest, WhatsAppTemplate } from '~/types/channel';

export const channelsApi = {
  list: async (): Promise<ChannelListItem[]> => {
    const { data } = await apiClient.get<ChannelListItem[]>('/channels');
    return data;
  },
  mine: async (): Promise<MyChannelListItem[]> => {
    const { data } = await apiClient.get<MyChannelListItem[]>('/channels/mine');
    return data;
  },
  get: async (id: string): Promise<ChannelDetail> => {
    const { data } = await apiClient.get<ChannelDetail>(`/channels/${id}`);
    return data;
  },
  setMembers: async (id: string, payload: SetChannelMembersRequest): Promise<void> => {
    await apiClient.put(`/channels/${id}/members`, payload);
  },
  listWhatsAppTemplates: async (id: string): Promise<WhatsAppTemplate[]> => {
    const { data } = await apiClient.get<WhatsAppTemplate[]>(`/channels/${id}/whatsapp-templates`);
    return data;
  },
};
