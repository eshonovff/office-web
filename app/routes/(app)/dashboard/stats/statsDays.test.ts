import { describe, expect, it } from 'vitest';
import { resolveStatsDays } from './statsDays';

describe('resolveStatsDays', () => {
  it('defaults to 14 when ?days= is absent', () => {
    expect(resolveStatsDays(new URLSearchParams())).toBe(14);
  });

  it.each([7, 14, 30, 90])('accepts %i as a valid value', (days) => {
    expect(resolveStatsDays(new URLSearchParams(`days=${days}`))).toBe(days);
  });

  it.each(['13', '1', '0', '-7', '365', 'abc', ''])('falls back to 14 for an invalid value (%s) instead of sending it to the backend', (days) => {
    expect(resolveStatsDays(new URLSearchParams(`days=${days}`))).toBe(14);
  });
});
