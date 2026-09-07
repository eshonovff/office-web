import { describe, expect, it, vi } from 'vitest';
import { translateFailureCode } from './failureCode';

// Mirrors how react-i18next's real t() behaves for interpolation, close enough for these tests —
// the point is asserting WHICH key gets requested and WITH what interpolation values.
function makeT() {
  return vi.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'failureCode.unknown') return `Хатои номаълуми ${options?.provider} (${options?.code})`;
    return key;
  });
}

describe('translateFailureCode', () => {
  it('translates null to the "unknown/none" key', () => {
    const t = makeT();
    expect(translateFailureCode(t, null)).toBe('failureCode.none');
    expect(t).toHaveBeenCalledWith('failureCode.none', { ns: 'dashboard' });
  });

  it('translates an exact known code (IG_2)', () => {
    const t = makeT();
    translateFailureCode(t, 'IG_2');
    expect(t).toHaveBeenCalledWith('failureCode.exact.IG_2', { ns: 'dashboard' });
  });

  it('translates an exact known code (FB_100_2018074)', () => {
    const t = makeT();
    translateFailureCode(t, 'FB_100_2018074');
    expect(t).toHaveBeenCalledWith('failureCode.exact.FB_100_2018074', { ns: 'dashboard' });
  });

  it('translates a suffix-matched code (WA_131030) via the shared window-closed/allowlist family', () => {
    const t = makeT();
    translateFailureCode(t, 'WA_131030');
    expect(t).toHaveBeenCalledWith('failureCode.suffix._131030', { ns: 'dashboard' });
  });

  it('translates every documented suffix code', () => {
    const t = makeT();
    for (const suffix of ['_131030', '_190', '_131047', '_470']) {
      translateFailureCode(t, `WA${suffix}`);
      expect(t).toHaveBeenCalledWith(`failureCode.suffix.${suffix}`, { ns: 'dashboard' });
    }
  });

  it('falls back to "unknown error for <provider> (<code>)" for an unrecognized code, naming the provider from the prefix', () => {
    const t = makeT();
    expect(translateFailureCode(t, 'IG_1')).toBe('Хатои номаълуми Instagram (IG_1)');
  });

  it('maps every known provider prefix to its full name in the fallback', () => {
    const t = makeT();
    expect(translateFailureCode(t, 'IG_999')).toContain('Instagram');
    expect(translateFailureCode(t, 'FB_999')).toContain('Facebook');
    expect(translateFailureCode(t, 'WA_999')).toContain('WhatsApp');
  });

  it('never silently drops the raw code for a totally unknown prefix — shows it as-is', () => {
    const t = makeT();
    expect(translateFailureCode(t, 'XX_42')).toBe('Хатои номаълуми XX (XX_42)');
  });
});
