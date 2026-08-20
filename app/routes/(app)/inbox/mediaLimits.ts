import type { MediaTypeLimit } from '~/types/conversation';

/**
 * Reads the pre-upload size limit for a file out of the conversation's own
 * mediaLimits (GET /conversations/{id} — MediaUploadValidator.LimitsFor on
 * the backend) instead of a second hardcoded copy, so a change to the real
 * limits (WhatsApp vs Messenger Platform) can't silently drift between what
 * the server enforces and what this pre-check allows through.
 */
function categoryFor(mimeType: string): MediaTypeLimit['category'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'audioVideo';
  return 'document';
}

export function maxBytesFor(mediaLimits: MediaTypeLimit[], mimeType: string): number {
  const category = categoryFor(mimeType);
  const limit = mediaLimits.find((l) => l.category === category);
  // Falls back to the largest known category if this conversation somehow
  // didn't carry the limit — under-validating client-side just means the
  // upload's real limit (still enforced server-side) is discovered a step
  // later, never an unsafe allowance.
  return limit?.maxSizeBytes ?? Math.max(0, ...mediaLimits.map((l) => l.maxSizeBytes));
}

export function formatMaxSize(bytes: number): string {
  return `${bytes / (1024 * 1024)} MB`;
}
