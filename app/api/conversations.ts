import type { AxiosProgressEvent } from 'axios';
import { apiClient, originClient } from '~/lib/client';
import type {
  AssignableUser,
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
  uploadMedia: async (id: string, file: File, onUploadProgress?: (event: AxiosProgressEvent) => void): Promise<Message> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<Message>(`/conversations/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return data;
  },
  uploadVoiceNote: async (id: string, file: File, onUploadProgress?: (event: AxiosProgressEvent) => void): Promise<Message> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<Message>(`/conversations/${id}/voice-note`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return data;
  },
  getMediaBlob: async (path: string): Promise<Blob> => {
    const { data } = await originClient.get<Blob>(path, { responseType: 'blob' });
    return data;
  },
  getThumbnailBlob: async (path: string): Promise<Blob> => {
    const { data } = await originClient.get<Blob>(path, { responseType: 'blob' });
    return data;
  },
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post(`/conversations/${id}/read`);
  },
  update: async (id: string, payload: UpdateConversationRequest): Promise<ConversationDetail> => {
    const { data } = await apiClient.patch<ConversationDetail>(`/conversations/${id}`, payload);
    return data;
  },
  listAssignableUsers: async (id: string): Promise<AssignableUser[]> => {
    const { data } = await apiClient.get<AssignableUser[]>(`/conversations/${id}/assignable-users`);
    return data;
  },
};
