import { describe, expect, it } from 'vitest';
import type { MediaTypeLimit } from '~/types/conversation';
import { formatMaxSize, maxBytesFor } from './mediaLimits';

const whatsAppLimits: MediaTypeLimit[] = [
  { category: 'image', maxSizeBytes: 5 * 1024 * 1024 },
  { category: 'audioVideo', maxSizeBytes: 16 * 1024 * 1024 },
  { category: 'document', maxSizeBytes: 100 * 1024 * 1024 },
];

const messengerLimits: MediaTypeLimit[] = [
  { category: 'image', maxSizeBytes: 25 * 1024 * 1024 },
  { category: 'audioVideo', maxSizeBytes: 25 * 1024 * 1024 },
  { category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
];

describe('maxBytesFor', () => {
  it('picks the image limit for an image mime type', () => {
    expect(maxBytesFor(whatsAppLimits, 'image/jpeg')).toBe(5 * 1024 * 1024);
  });

  it('picks the audioVideo limit for both audio and video mime types', () => {
    expect(maxBytesFor(whatsAppLimits, 'video/mp4')).toBe(16 * 1024 * 1024);
    expect(maxBytesFor(whatsAppLimits, 'audio/ogg')).toBe(16 * 1024 * 1024);
  });

  it('picks the document limit for anything else', () => {
    expect(maxBytesFor(whatsAppLimits, 'application/pdf')).toBe(100 * 1024 * 1024);
  });

  it('uses the same (larger) flat limit across every category for Instagram/Facebook', () => {
    expect(maxBytesFor(messengerLimits, 'image/jpeg')).toBe(25 * 1024 * 1024);
    expect(maxBytesFor(messengerLimits, 'video/mp4')).toBe(25 * 1024 * 1024);
    expect(maxBytesFor(messengerLimits, 'application/pdf')).toBe(25 * 1024 * 1024);
  });

  it('falls back to the largest known limit rather than under- or over-allowing when a category is missing', () => {
    const partial: MediaTypeLimit[] = [{ category: 'document', maxSizeBytes: 10 * 1024 * 1024 }];
    expect(maxBytesFor(partial, 'image/jpeg')).toBe(10 * 1024 * 1024);
  });

  // Regression: Math.max(0, ...[]) on a genuinely empty array used to silently
  // resolve to 0, which rejected every upload — voice notes included, since
  // they go through this same check — before the request ever reached the
  // server that could give the operator a real reason. Reproduced by an
  // office-api backend not yet running the commit that added mediaLimits (the
  // key is then absent from the JSON entirely, not merely empty) or by a
  // stale client-side cache from before that field existed.
  describe('empty or missing mediaLimits never resolves to a 0-byte limit (regression)', () => {
    it('falls back to a safe non-zero default when mediaLimits is an empty array', () => {
      expect(maxBytesFor([], 'image/jpeg')).toBeGreaterThan(0);
      expect(maxBytesFor([], 'audio/webm')).toBeGreaterThan(0);
      expect(maxBytesFor([], 'application/pdf')).toBeGreaterThan(0);
    });

    it('falls back to a safe non-zero default when mediaLimits is undefined', () => {
      expect(maxBytesFor(undefined, 'image/jpeg')).toBeGreaterThan(0);
      expect(maxBytesFor(undefined, 'audio/webm')).toBeGreaterThan(0);
    });

    it('a normal-sized voice note (well under 16MB) is not rejected when mediaLimits is empty', () => {
      const typicalVoiceNoteBytes = 500 * 1024; // a few seconds of webm/opus
      expect(typicalVoiceNoteBytes).toBeLessThanOrEqual(maxBytesFor([], 'audio/webm'));
    });

    it('a normal-sized photo (well under 5MB) is not rejected when mediaLimits is empty', () => {
      const typicalPhotoBytes = 2 * 1024 * 1024;
      expect(typicalPhotoBytes).toBeLessThanOrEqual(maxBytesFor([], 'image/jpeg'));
    });
  });
});

describe('formatMaxSize', () => {
  it('renders whole megabytes without decimals', () => {
    expect(formatMaxSize(25 * 1024 * 1024)).toBe('25 MB');
  });
});
