import { describe, expect, it } from 'vitest';
import { formatPhoneNumber } from '~/lib/format';

describe('formatPhoneNumber', () => {
  it('groups a Tajik number (992 + 9 digits) into the local pattern', () => {
    expect(formatPhoneNumber('992509886588')).toBe('+992 50 988 65 88');
  });

  it('groups it the same way when the raw value already has a leading +', () => {
    expect(formatPhoneNumber('+992509886588')).toBe('+992 50 988 65 88');
  });

  it('falls back to a bare leading + for a non-Tajik number, since there is no grouping rule for it', () => {
    expect(formatPhoneNumber('15551234567')).toBe('+15551234567');
  });

  it('leaves an already-prefixed non-Tajik number as-is', () => {
    expect(formatPhoneNumber('+15551234567')).toBe('+15551234567');
  });
});
