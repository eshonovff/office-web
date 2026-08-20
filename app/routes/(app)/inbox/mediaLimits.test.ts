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
});

describe('formatMaxSize', () => {
  it('renders whole megabytes without decimals', () => {
    expect(formatMaxSize(25 * 1024 * 1024)).toBe('25 MB');
  });
});
