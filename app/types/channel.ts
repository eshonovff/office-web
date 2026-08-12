import type { ChannelType } from '~/types/conversation';

export interface ChannelListItem {
  id: string;
  type: ChannelType;
  name: string;
  externalId: string;
  isActive: boolean;
  createdAt: string;
}

export interface MyChannelListItem {
  id: string;
  type: ChannelType;
  name: string;
  isActive: boolean;
  joinable?: boolean;
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

export interface CreateChannelRequest {
  type: ChannelType;
  name: string;
  externalId: string;
  credentials: string;
}

export interface UpdateChannelRequest {
  name: string;
  credentials?: string;
  isActive: boolean;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  bodyText: string | null;
}
