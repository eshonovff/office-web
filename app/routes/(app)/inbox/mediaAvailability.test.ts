import { describe, expect, it } from 'vitest';
import { getServerMediaState } from './mediaAvailability';

describe('getServerMediaState', () => {
  it('is pending when nothing has happened yet — MediaDownloadJob has not finished', () => {
    expect(getServerMediaState({ mediaUrl: null, mediaDeletedAt: null, mediaDownloadError: null })).toBe('pending');
  });

  it('is ready once mediaUrl is populated', () => {
    expect(getServerMediaState({ mediaUrl: '/whatsapp-media/x', mediaDeletedAt: null, mediaDownloadError: null })).toBe('ready');
  });

  it('is failed when the server recorded a download error, even if mediaUrl is somehow set', () => {
    expect(getServerMediaState({ mediaUrl: null, mediaDeletedAt: null, mediaDownloadError: 'timed out' })).toBe('failed');
  });

  it('is deleted once retention removed the file, taking priority over a download error', () => {
    expect(
      getServerMediaState({ mediaUrl: '/whatsapp-media/x', mediaDeletedAt: '2026-08-01T00:00:00Z', mediaDownloadError: 'timed out' })
    ).toBe('deleted');
  });
});
