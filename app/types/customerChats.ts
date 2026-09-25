// Mirrors office-api/Office.Api/Features/CustomerChats/Contracts.cs.
import type { ChannelType } from '~/types/conversation';
import type { MessageType } from '~/types/message';

export interface CustomerLastMessage {
  type: MessageType;
  direction: 'Inbound' | 'Outbound';
  body: string | null;
}

export interface CustomerChatListItem {
  id: string;
  channelId: string;
  channelType: ChannelType;
  channelName: string;
  contactName: string | null;
  contactAvatarUrl: string | null;
  contactUsername: string | null;
  lastMessageAt: string | null;
  lastMessage: CustomerLastMessage | null;
  unreadCount: number;
  /** Meta allows a reply only within 24 h of the fan's last message. Null: not known. */
  windowExpiresAt: string | null;
  createdAt: string;
}

export interface CustomerChatDetail extends Omit<CustomerChatListItem, 'lastMessage'> {
  /** False once the plan has run out — the history stays readable. */
  canSend: boolean;
  channelNeedsReconnect: boolean;
}

export interface CustomerChatsListParams {
  search?: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}
