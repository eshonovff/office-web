export type MessageDirection = 'Inbound' | 'Outbound';
export type MessageType = 'Text' | 'Image' | 'Video' | 'Audio' | 'File' | 'StoryReply' | 'Location' | 'Contact';
// Cancelled = pulled back during the delayed-send window (item 5 on the
// backend) — never reached the provider, distinct from Failed (reached the
// dispatch job but the provider/window check rejected it).
export type MessageDeliveryStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed' | 'Cancelled';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  body: string | null;
  mediaUrl: string | null;
  externalId: string | null;
  deliveryStatus: MessageDeliveryStatus;
  isInternalNote: boolean;
  sentByUserId: string | null;
  sentByUserName: string | null;
  createdAt: string;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFileName: string | null;
  voiceDurationSeconds: number | null;
  thumbnailUrl: string | null;
  mediaDeletedAt: string | null;
  mediaDownloadError: string | null;
  waveformPeaks: number[] | null;
  // Set when dispatch fails after the delay (e.g. the 24h window closed
  // during the wait) — only meaningful when deliveryStatus is Failed. Always
  // short, human-readable text (backend's MetaErrorTranslator translates raw
  // Meta Graph API errors before this is ever set — never JSON).
  failureReason: string | null;
  // The raw Meta Graph API error body, only when failureReason came from a GraphApiException —
  // debug-only, rendered collapsed (never as the primary failure text, that's failureReason).
  failureDetail: string | null;
  // A shared Reel/Post/Story's real Instagram permalink — never downloadable media (Instagram
  // only ever gives a web page link for these, confirmed live), so it's a link-out, not a player.
  // A dedicated field, not embedded in body text — an earlier version did that and the "open in
  // Instagram" button ended up pointing at the wrong place.
  externalContentUrl: string | null;
  // 'Reel' | 'Post' | 'Story' — only set alongside externalContentUrl.
  externalContentKind: string | null;
}

export interface MessagesListParams {
  page?: number;
  pageSize?: number;
}

export interface SendMessageRequest {
  body?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: string[];
  // Stored in the thread, never dispatched to the customer — mutually
  // exclusive with a template on the backend. Never claims an unassigned
  // conversation either (it isn't a "reply"), and doesn't touch unread
  // counts or the 24h window (both only ever move on the inbound path).
  isInternalNote?: boolean;
}
