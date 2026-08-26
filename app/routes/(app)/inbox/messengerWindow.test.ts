import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getMessengerSendMode } from './messengerWindow';

const now = dayjs('2026-08-20T12:00:00Z');

describe('getMessengerSendMode', () => {
  it('is plain when there is no window yet (no inbound message ever received)', () => {
    expect(getMessengerSendMode(null, now)).toBe('plain');
  });

  it('is plain while the 24h window is still open', () => {
    const windowExpiresAt = now.add(1, 'hour').toISOString();
    expect(getMessengerSendMode(windowExpiresAt, now)).toBe('plain');
  });

  it('is tag, not plain, at the exact expiry instant — the window counts as closed at that point, matching the backend (> now, not >=)', () => {
    expect(getMessengerSendMode(now.toISOString(), now)).toBe('tag');
  });

  it('is tag just after the 24h window closes', () => {
    const windowExpiresAt = now.subtract(1, 'minute').toISOString();
    expect(getMessengerSendMode(windowExpiresAt, now)).toBe('tag');
  });

  it('is tag right up to the 7-day mark (24h window + 6 more days)', () => {
    const windowExpiresAt = now.subtract(6, 'day').toISOString();
    expect(getMessengerSendMode(windowExpiresAt, now)).toBe('tag');
  });

  it('is reject just past the 7-day mark', () => {
    const windowExpiresAt = now.subtract(6, 'day').subtract(1, 'minute').toISOString();
    expect(getMessengerSendMode(windowExpiresAt, now)).toBe('reject');
  });

  it('is reject long after the 7-day mark', () => {
    const windowExpiresAt = now.subtract(30, 'day').toISOString();
    expect(getMessengerSendMode(windowExpiresAt, now)).toBe('reject');
  });
});
