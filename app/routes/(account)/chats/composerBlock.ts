import type { CustomerChatDetail } from '~/types/customerChats';

// Instagram's own limit for a text message (SendCustomerMessageRequestValidator on the backend).
export const MAX_MESSAGE_LENGTH = 1000;

export type ComposerBlock = 'plan' | 'reconnect' | 'window' | null;

/** Why a reply is impossible right now — checked here so the reason shows before anyone types. */
export function composerBlock(chat: CustomerChatDetail, now: Date = new Date()): ComposerBlock {
  if (!chat.canSend) return 'plan';
  if (chat.channelNeedsReconnect) return 'reconnect';
  if (chat.windowExpiresAt && new Date(chat.windowExpiresAt) <= now) return 'window';
  return null;
}
