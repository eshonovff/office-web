import { describe, expect, it } from 'vitest';
import { shouldRetry } from './query-client';

function withStatus(status: number) {
  return { response: { status } };
}

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404])('never retries a %i', (status) => {
    expect(shouldRetry(0, withStatus(status))).toBe(false);
  });

  it('retries a 500 up to the small limit', () => {
    expect(shouldRetry(0, withStatus(500))).toBe(true);
    expect(shouldRetry(1, withStatus(500))).toBe(true);
    expect(shouldRetry(2, withStatus(500))).toBe(false);
  });

  it('retries a network error (no response) up to the small limit', () => {
    expect(shouldRetry(0, {})).toBe(true);
    expect(shouldRetry(1, {})).toBe(true);
    expect(shouldRetry(2, {})).toBe(false);
  });
});
