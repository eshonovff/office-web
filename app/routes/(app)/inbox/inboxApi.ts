import type { AxiosProgressEvent } from 'axios';
import { createContext, useContext } from 'react';
import { conversationsApi } from '~/api/conversations';

/**
 * What the shared message components (MessageBubble, media hooks) call on the server. Staff by
 * default; the мизоҷ chats page provides its own, pointing at /api/public with the мизоҷ's token
 * — the same components, never the staff session or staff endpoints.
 */
export interface InboxApi {
  getMediaBlob: (
    path: string,
    config?: { onDownloadProgress?: (event: AxiosProgressEvent) => void; signal?: AbortSignal }
  ) => Promise<Blob>;
  getThumbnailBlob: (path: string) => Promise<Blob>;
  cancelMessage: (conversationId: string, messageId: string) => Promise<unknown>;
  /** The query to refresh after a cancel — each side caches messages under its own key. */
  messagesQueryKey: (conversationId: string) => readonly unknown[];
}

export const staffInboxApi: InboxApi = {
  getMediaBlob: conversationsApi.getMediaBlob,
  getThumbnailBlob: conversationsApi.getThumbnailBlob,
  cancelMessage: conversationsApi.cancelMessage,
  messagesQueryKey: (conversationId) => ['conversations', conversationId, 'messages'],
};

const InboxApiContext = createContext<InboxApi>(staffInboxApi);

export const InboxApiProvider = InboxApiContext.Provider;

export function useInboxApi(): InboxApi {
  return useContext(InboxApiContext);
}
