import type { AxiosProgressEvent } from 'axios';
import { customerApiClient } from '~/lib/customerClient';
import type { PagedResult } from '~/types/conversation';
import type { CustomerChatDetail, CustomerChatListItem, CustomerChatsListParams } from '~/types/customerChats';
import type { Message } from '~/types/message';

// Media links in a мизоҷ's messages are absolute ("/api/public/messages/{id}/media");
// customerApiClient already sits on /api/public and carries the мизоҷ token.
const relativeToPublicApi = (path: string) => path.replace(/^\/api\/public/, '');

export const customerChatsApi = {
  list: async (params: CustomerChatsListParams): Promise<PagedResult<CustomerChatListItem>> => {
    const { data } = await customerApiClient.get<PagedResult<CustomerChatListItem>>('/conversations', { params });
    return data;
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await customerApiClient.get<{ count: number }>('/conversations/unread-count');
    return data.count;
  },
  get: async (id: string): Promise<CustomerChatDetail> => {
    const { data } = await customerApiClient.get<CustomerChatDetail>(`/conversations/${id}`);
    return data;
  },
  listMessages: async (id: string, params: { page: number; pageSize: number }): Promise<PagedResult<Message>> => {
    const { data } = await customerApiClient.get<PagedResult<Message>>(`/conversations/${id}/messages`, { params });
    return data;
  },
  send: async (id: string, body: string): Promise<Message> => {
    const { data } = await customerApiClient.post<Message>(`/conversations/${id}/messages`, { body });
    return data;
  },
  cancelMessage: async (id: string, messageId: string): Promise<Message> => {
    const { data } = await customerApiClient.post<Message>(`/conversations/${id}/messages/${messageId}/cancel`);
    return data;
  },
  markAsRead: async (id: string): Promise<CustomerChatDetail> => {
    const { data } = await customerApiClient.post<CustomerChatDetail>(`/conversations/${id}/read`);
    return data;
  },
  getMediaBlob: async (
    path: string,
    config?: { onDownloadProgress?: (event: AxiosProgressEvent) => void; signal?: AbortSignal }
  ): Promise<Blob> => {
    const { data } = await customerApiClient.get<Blob>(relativeToPublicApi(path), { responseType: 'blob', ...config });
    return data;
  },
  getThumbnailBlob: async (path: string): Promise<Blob> => {
    const { data } = await customerApiClient.get<Blob>(relativeToPublicApi(path), { responseType: 'blob' });
    return data;
  },
};

/** One root, so a realtime "ChatUpdated" or a reply can refresh every chat query at once. */
export const customerChatKeys = {
  all: ['customer-chats'] as const,
  list: (params: CustomerChatsListParams) => ['customer-chats', 'list', params] as const,
  unreadCount: ['customer-chats', 'unread-count'] as const,
  detail: (id: string) => ['customer-chats', id, 'detail'] as const,
  messages: (id: string) => ['customer-chats', id, 'messages'] as const,
};
