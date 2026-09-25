import { customerApiClient } from '~/lib/customerClient';
import type { CommentSyncResult, CustomerComment, CustomerCommentPostsResult } from '~/types/customerComments';

export const customerCommentsApi = {
  posts: async (channelId: string, after?: string): Promise<CustomerCommentPostsResult> => {
    const { data } = await customerApiClient.get<CustomerCommentPostsResult>('/comments/posts', {
      params: { channelId, after },
    });
    return data;
  },
  list: async (channelId: string, mediaId: string): Promise<CustomerComment[]> => {
    const { data } = await customerApiClient.get<CustomerComment[]>('/comments', { params: { channelId, mediaId } });
    return data;
  },
  newCount: async (): Promise<number> => {
    const { data } = await customerApiClient.get<{ count: number }>('/comments/new-count');
    return data.count;
  },
  markRead: async (channelId: string, mediaId: string): Promise<void> => {
    await customerApiClient.post('/comments/read', { channelId, mediaId });
  },
  sync: async (channelId: string, mediaId: string): Promise<CommentSyncResult> => {
    const { data } = await customerApiClient.post<CommentSyncResult>('/comments/sync', { channelId, mediaId });
    return data;
  },
  reply: async (id: string, text: string): Promise<void> => {
    await customerApiClient.post(`/comments/${id}/reply`, { text });
  },
  sendDirect: async (id: string, text: string): Promise<void> => {
    await customerApiClient.post(`/comments/${id}/direct`, { text });
  },
  setHidden: async (id: string, hidden: boolean): Promise<void> => {
    await customerApiClient.post(`/comments/${id}/hide`, { hidden });
  },
  remove: async (id: string): Promise<void> => {
    await customerApiClient.delete(`/comments/${id}`);
  },
};

/** One root: a realtime CommentsUpdated or an action refreshes every comments query at once. */
export const customerCommentKeys = {
  all: ['customer-comments'] as const,
  posts: (channelId: string) => ['customer-comments', 'posts', channelId] as const,
  list: (channelId: string, mediaId: string) => ['customer-comments', 'list', channelId, mediaId] as const,
  newCount: ['customer-comments', 'new-count'] as const,
};
