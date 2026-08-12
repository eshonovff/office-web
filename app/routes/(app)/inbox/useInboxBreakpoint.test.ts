import { describe, expect, it } from 'vitest';
import { getInboxBreakpoint } from './useInboxBreakpoint';

describe('getInboxBreakpoint', () => {
  it('is mobile below the tablet breakpoint', () => {
    expect(getInboxBreakpoint(true, true)).toBe('mobile');
  });

  it('is tablet between the tablet and desktop breakpoints', () => {
    expect(getInboxBreakpoint(false, true)).toBe('tablet');
  });

  it('is desktop at or above the desktop breakpoint', () => {
    expect(getInboxBreakpoint(false, false)).toBe('desktop');
  });
});
