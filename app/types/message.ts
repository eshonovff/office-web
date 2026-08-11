export type MessageDirection = 'Inbound' | 'Outbound';
export type MessageType = 'Text' | 'Image' | 'Video' | 'Audio' | 'File' | 'StoryReply' | 'Location' | 'Contact';
export type MessageDeliveryStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

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
}
