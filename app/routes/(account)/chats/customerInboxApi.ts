import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import type { InboxApi } from '~/routes/(app)/inbox/inboxApi';

// What the shared MessageBubble calls on this page: the мизоҷ endpoints and token, never staff ones.
export const customerInboxApi: InboxApi = {
  getMediaBlob: customerChatsApi.getMediaBlob,
  getThumbnailBlob: customerChatsApi.getThumbnailBlob,
  cancelMessage: customerChatsApi.cancelMessage,
  messagesQueryKey: customerChatKeys.messages,
};
