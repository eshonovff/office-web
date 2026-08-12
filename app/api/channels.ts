import { apiClient } from '~/lib/client';
import type {
  ChannelDetail,
  ChannelListItem,
  CreateChannelRequest,
  MyChannelListItem,
  SetChannelMembersRequest,
  UpdateChannelRequest,
  WhatsAppTemplate,
} from '~/types/channel';
import type { AssignableUser } from '~/types/conversation';

export const channelsApi = {
  list: async (): Promise<ChannelListItem[]> => {
    const { data } = await apiClient.get<ChannelListItem[]>('/channels');
    return data;
  },
  create: async (payload: CreateChannelRequest): Promise<ChannelDetail> => {
    const { data } = await apiClient.post<ChannelDetail>('/channels', payload);
    return data;
  },
  update: async (id: string, payload: UpdateChannelRequest): Promise<ChannelDetail> => {
    const { data } = await apiClient.patch<ChannelDetail>(`/channels/${id}`, payload);
    return data;
  },
  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/channels/${id}`);
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
  listAssignableUsers: async (id: string): Promise<AssignableUser[]> => {
    const { data } = await apiClient.get<AssignableUser[]>(`/channels/${id}/assignable-users`);
    return data;
  },
};
