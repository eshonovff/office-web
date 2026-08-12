export type ConversationStatus = 'New' | 'InProgress' | 'Waiting' | 'Closed';
export type ChannelType = 'WhatsApp' | 'Instagram' | 'Facebook';

export interface ConversationListItem {
  id: string;
  channelId: string;
  channelType: ChannelType;
  channelName: string;
  externalId: string;
  contactName: string | null;
  contactAvatarUrl: string | null;
  status: ConversationStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  windowExpiresAt: string | null;
  createdAt: string;
}

// Backend's ConversationDetail record has the exact same fields as
// ConversationListItem — no embedded messages or channel object.
export type ConversationDetail = ConversationListItem;

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ConversationsListParams {
  channelId?: string;
  status?: ConversationStatus;
  assignedUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateConversationRequest {
  status?: ConversationStatus;
  assignedTo?: string | null;
}

// GET /conversations/{id}/assignable-users — members of that conversation's
// channel. Doesn't include Owner/Admin unless they're also a channel member,
// even though PATCH .assignedTo accepts them too.
export interface AssignableUser {
  userId: string;
  fullName: string;
  username: string;
}
