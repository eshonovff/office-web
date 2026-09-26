// What a мизоҷ may send in a chat — the same list as the server's
// (CustomerChatsEndpoints.SendableMediaTypes): what Instagram delivers, nothing a browser would run.
// Checked here only to say so at once; the server checks again.
export const SENDABLE_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/mpeg',
  'application/pdf',
];

const MB = 1024 * 1024;

/** Instagram: an image up to 8 MB, anything else up to 25 MB. */
export function maxBytesFor(type: string): number {
  return type.startsWith('image/') ? 8 * MB : 25 * MB;
}

/** Why this file can't be sent, or null if it can. */
export function sendableProblem(file: File): { key: 'fileNotAllowed' } | { key: 'fileTooBig'; mb: number } | null {
  const type = file.type.toLowerCase();
  if (!SENDABLE_MEDIA_TYPES.includes(type)) return { key: 'fileNotAllowed' };
  if (file.size > maxBytesFor(type)) return { key: 'fileTooBig', mb: maxBytesFor(type) / MB };
  return null;
}
