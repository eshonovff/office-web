import type { ChannelType } from '~/types/conversation';

export interface ChannelListItem {
  id: string;
  type: ChannelType;
  name: string;
  externalId: string;
  isActive: boolean;
  createdAt: string;
  // Meta responded with a token error (or an automatic refresh failed) — sending is broken until
  // someone reconnects (OAuth) or pastes fresh credentials. Used to be silent (owner notification
  // only); now surfaced here too.
  requiresReconnect: boolean;
  // Facebook/Instagram: the webhook subscription check after /connect found something missing
  // (Page-level, or Meta's App Dashboard product config) — messages won't arrive until it's
  // fixed. null = confirmed fine, or this channel type has no such subscription (WhatsApp).
  webhookSetupWarning: string | null;
  // Instagram only (ig_exchange_token/ig_refresh_token give this) — null for WhatsApp/Facebook.
  credentialsExpiresAt: string | null;
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

/** WhatsApp keeps the manual-credentials flow — only these two support OAuth. */
export type OAuthProvider = 'Instagram' | 'Facebook';

export interface OAuthStartResponse {
  url: string;
}

/** A Page (Facebook) or business account (Instagram) the operator can connect — never carries a token. */
export interface OAuthAccountOption {
  externalId: string;
  name: string;
}

export interface OAuthCallbackResponse {
  connectionId: string;
  accounts: OAuthAccountOption[];
}

export interface ConnectChannelOAuthRequest {
  connectionId: string;
  externalId: string;
  name: string;
}
