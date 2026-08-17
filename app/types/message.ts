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
  // during the wait) — only meaningful when deliveryStatus is Failed.
  failureReason: string | null;
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
