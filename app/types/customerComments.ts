// Mirrors office-api/Office.Api/Features/CustomerComments/Contracts.cs.

export interface CustomerCommentPost {
  mediaId: string;
  mediaType: string | null;
  imageUrl: string | null;
  permalink: string | null;
  caption: string | null;
  timestamp: string | null;
  /** Fans' comments stored for this post (the account's own replies not counted). */
  commentCount: number;
  newCount: number;
}

export interface CustomerCommentPostsResult {
  items: CustomerCommentPost[];
  nextCursor: string | null;
}

/** Only our ids — never Meta's — so an action can only name a row this мизоҷ may see. */
export interface CustomerComment {
  id: string;
  parentId: string | null;
  authorUsername: string | null;
  isOwn: boolean;
  postedByAutomation: boolean;
  text: string;
  commentedAt: string;
  isHidden: boolean;
  isRead: boolean;
  directSent: boolean;
  canSendDirect: boolean;
  /** Meta allows the one Direct message within 7 days of the comment. */
  directAvailableUntil: string;
  autoReplyError: string | null;
}

export interface CommentSyncResult {
  added: number;
  throttled: boolean;
}
