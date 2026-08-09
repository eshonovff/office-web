import { apiClient } from '~/lib/client';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationsListParams,
  PagedResult,
  UpdateConversationRequest,
} from '~/types/conversation';
import type { Message, MessagesListParams, SendMessageRequest } from '~/types/message';

export const conversationsApi = {
  list: async (params: ConversationsListParams): Promise<PagedResult<ConversationListItem>> => {
    const { data } = await apiClient.get<PagedResult<ConversationListItem>>('/conversations', { params });
    return data;
  },
  get: async (id: string): Promise<ConversationDetail> => {
    const { data } = await apiClient.get<ConversationDetail>(`/conversations/${id}`);
    return data;
  },
  listMessages: async (id: string, params?: MessagesListParams): Promise<PagedResult<Message>> => {
    const { data } = await apiClient.get<PagedResult<Message>>(`/conversations/${id}/messages`, { params });
    return data;
  },
  sendMessage: async (id: string, payload: SendMessageRequest): Promise<Message> => {
    const { data } = await apiClient.post<Message>(`/conversations/${id}/messages`, payload);
    return data;
  },
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post(`/conversations/${id}/read`);
  },
  update: async (id: string, payload: UpdateConversationRequest): Promise<ConversationDetail> => {
    const { data } = await apiClient.patch<ConversationDetail>(`/conversations/${id}`, payload);
    return data;
  },
};
