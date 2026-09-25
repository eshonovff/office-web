// Mirrors office-api/Office.Api/Features/CustomerContacts/Contracts.cs.

export interface ContactVariable {
  key: string;
  value: string;
}

export interface CustomerContactListItem {
  id: string;
  channelId: string;
  channelType: 'Instagram' | 'Facebook' | 'WhatsApp';
  channelName: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  tags: string[];
  /** The first few details (name, phone, …) the flows collected. */
  variables: ContactVariable[];
  firstSeenAt: string;
  lastMessageAt: string | null;
  /** When the 24-hour window closes, if it is open now — a message can be sent until then. */
  canMessageUntil: string | null;
}

export type FollowStatus = 'Following' | 'NotFollowing' | 'Unknown';
export type ContactAutomationStatus = 'Active' | 'Waiting' | 'Finished' | 'Failed';

export interface ContactAutomation {
  flowId: string;
  flowName: string;
  status: ContactAutomationStatus;
  startedAt: string;
}

export interface CustomerContactDetail extends CustomerContactListItem {
  messageCount: number;
  commentCount: number;
  followStatus: FollowStatus | null;
  followCheckedAt: string | null;
  automations: ContactAutomation[];
}

export interface ContactTagCount {
  tag: string;
  count: number;
}

export interface ContactsFilter {
  channelId?: string;
  search?: string;
  tag?: string;
}
