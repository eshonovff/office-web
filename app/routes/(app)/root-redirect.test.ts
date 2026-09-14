import { describe, expect, it } from 'vitest';
import { clientLoader } from './root-redirect';

describe('root-redirect clientLoader', () => {
  it('redirects / to /dashboard (dashboard needs a real path segment to nest /dashboard/stats under)', () => {
    const result = clientLoader();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get('Location')).toBe('/dashboard');
  });
});
