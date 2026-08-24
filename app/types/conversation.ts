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
  // Instagram @handle only (Facebook's Profile API doesn't expose one) — for a link to
  // instagram.com/{contactUsername} in the UI.
  contactUsername: string | null;
  status: ConversationStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  windowExpiresAt: string | null;
  createdAt: string;
}

/** GET /conversations returns this per category — WhatsApp has three distinct limits, Instagram/Facebook one flat limit repeated across all three (see MediaUploadValidator.LimitsFor on the backend). */
export interface MediaTypeLimit {
  category: 'image' | 'audioVideo' | 'document';
  maxSizeBytes: number;
}

// Backend's ConversationDetail record has the same fields as
// ConversationListItem plus mediaLimits — the list response stays lean
// (fetched in bulk), the single-conversation one carries the numbers the
// Composer needs to pre-validate an upload (see lib/mediaLimits.ts).
export interface ConversationDetail extends ConversationListItem {
  mediaLimits: MediaTypeLimit[];
}

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

export type ConversationAssignmentReason = 'ClaimedOnReply' | 'Takeover' | 'Reassigned' | 'AutoReleased';

// GET /conversations/{id}/assignment-history — fromUserId/toUserId null on
// the edges: ClaimedOnReply has no `from` (conversation was unassigned),
// AutoReleased has no `to` (released back to the pool, not to a person).
export interface ConversationAssignmentEvent {
  id: string;
  fromUserId: string | null;
  fromUserName: string | null;
  toUserId: string | null;
  toUserName: string | null;
  reason: ConversationAssignmentReason;
  createdAt: string;
}

export interface AssignmentHistoryListParams {
  page?: number;
  pageSize?: number;
}

// GET /conversations/{id}/assignable-users — members of that conversation's
// channel. Doesn't include Owner/Admin unless they're also a channel member,
// even though PATCH .assignedTo accepts them too.
export interface AssignableUser {
  userId: string;
  fullName: string;
  username: string;
}
