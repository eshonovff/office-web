import type { Message } from '~/types/message';

/**
 * Where a message's media stands on the SERVER, independent of whether the
 * browser has fetched the actual bytes yet (that's useMessageBlobUrl's
 * concern, layered on top of this once state is 'ready').
 *
 * 'pending' is the one MediaStatus/MessageMedia didn't distinguish before:
 * MediaDownloadJob runs as a background job after the webhook lands the
 * message, so mediaUrl is null for a real, visible stretch of time on a
 * brand-new message — not an error, not "no media", just "not yet". The
 * realtime MessageReceived event MediaDownloadJob publishes when it finishes
 * (success or failure) is what moves a message out of this state without
 * needing the UI to poll for it.
 */
export type ServerMediaState = 'pending' | 'ready' | 'failed' | 'deleted';

export function getServerMediaState(message: Pick<Message, 'mediaUrl' | 'mediaDeletedAt' | 'mediaDownloadError'>): ServerMediaState {
  if (message.mediaDeletedAt) return 'deleted';
  if (message.mediaDownloadError) return 'failed';
  return message.mediaUrl ? 'ready' : 'pending';
}
