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

// The backend's own WhatsApp numbers (MediaUploadValidator.ImageMaxBytes etc) — used ONLY
// when the conversation carried no limits at all (mediaLimits empty/missing), which
// LimitsFor's own logic can never produce on a current backend (it's an unconditional
// 3-entry literal — see MediaUploadValidator.cs). Seeing this fallback fire in practice
// means the client fetched a stale response: an old backend process not yet running the
// commit that added this field, or a React Query cache entry from before it existed —
// not a case this code can distinguish from here, just recover from without crashing.
const FALLBACK_LIMITS: Record<MediaTypeLimit['category'], number> = {
  image: 5 * 1024 * 1024,
  audioVideo: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

export function maxBytesFor(mediaLimits: MediaTypeLimit[] | undefined, mimeType: string): number {
  const category = categoryFor(mimeType);
  const limit = mediaLimits?.find((l) => l.category === category);
  if (limit) return limit.maxSizeBytes;

  if (mediaLimits && mediaLimits.length > 0) {
    // This specific category is missing from an otherwise-populated list —
    // LimitsFor never does this today (always all three), but if it ever did
    // partially, the largest present value is a safer guess than jumping to
    // an unrelated hardcoded number below.
    return Math.max(...mediaLimits.map((l) => l.maxSizeBytes));
  }

  // mediaLimits was empty or missing entirely (see the FALLBACK_LIMITS comment
  // above). Math.max(0, ...[]) on a genuinely empty array used to silently
  // resolve to 0 here, which rejected every upload — including voice notes,
  // which go through this same function — before the request ever reached the
  // server that could give a real reason.
  return FALLBACK_LIMITS[category];
}

export function formatMaxSize(bytes: number): string {
  return `${bytes / (1024 * 1024)} MB`;
}
