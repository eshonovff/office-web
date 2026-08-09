import type { ChannelType } from '~/types/conversation';

export interface ChannelListItem {
  id: string;
  type: ChannelType;
  name: string;
  externalId: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChannelMember {
  userId: string;
  fullName: string;
  username: string;
}

export interface ChannelDetail extends ChannelListItem {
  members: ChannelMember[];
}

export interface SetChannelMembersRequest {
  userIds: string[];
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  bodyText: string | null;
}
