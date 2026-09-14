import { describe, expect, it, vi } from 'vitest';
import { translateFunnelStage } from './funnelStage';

function makeT() {
  return vi.fn((key: string) => key);
}

describe('translateFunnelStage', () => {
  it('translates each known raw backend stage string to its i18n key', () => {
    const t = makeT();
    expect(translateFunnelStage(t, 'Омад')).toBe('stats.funnel.stageArrived');
    expect(translateFunnelStage(t, 'Ҷавоб гирифт')).toBe('stats.funnel.stageResponded');
    expect(translateFunnelStage(t, 'Баста шуд')).toBe('stats.funnel.stageClosed');
  });

  it('falls back to the raw string for a stage the backend never documented, instead of dropping it', () => {
    const t = makeT();
    expect(translateFunnelStage(t, 'Хатои нав')).toBe('Хатои нав');
  });
});
