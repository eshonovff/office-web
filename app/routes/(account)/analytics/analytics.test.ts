import { describe, expect, it } from 'vitest';
import {
  addDays,
  change,
  dayCount,
  dushanbeToday,
  percentOf,
  previousRange,
  rangeError,
  resolvePeriod,
  safeImageSrc,
  safeInstagramLink,
} from './analytics';

const TODAY = '2026-09-26';
const params = (query: string) => new URLSearchParams(query);

describe('dushanbeToday', () => {
  it('is the date in Dushanbe (UTC+5), not in UTC', () => {
    expect(dushanbeToday(Date.parse('2026-09-26T18:59:59Z'))).toBe('2026-09-26');
    expect(dushanbeToday(Date.parse('2026-09-26T19:00:00Z'))).toBe('2026-09-27'); // midnight in Dushanbe
  });
});

describe('dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-09-26', -29)).toBe('2026-08-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('counts both ends', () => {
    expect(dayCount({ from: TODAY, to: TODAY })).toBe(1);
    expect(dayCount({ from: '2026-08-28', to: TODAY })).toBe(30);
  });

  it('compares with the same number of days just before', () => {
    expect(previousRange({ from: '2026-09-20', to: TODAY })).toEqual({ from: '2026-09-13', to: '2026-09-19' });
    expect(previousRange({ from: TODAY, to: TODAY })).toEqual({ from: '2026-09-25', to: '2026-09-25' });
  });
});

describe("rangeError — the server's limits, explained before asking", () => {
  it('accepts a real range up to 366 days, ending today at the latest', () => {
    expect(rangeError('2026-09-01', TODAY, TODAY)).toBeNull();
    expect(rangeError(TODAY, TODAY, TODAY)).toBeNull();
    expect(rangeError('2025-09-26', TODAY, TODAY)).toBeNull(); // 366 days
  });

  it('refuses what the server would', () => {
    expect(rangeError(null, TODAY, TODAY)).toBe('missing');
    expect(rangeError('2026-02-30', TODAY, TODAY)).toBe('missing');
    expect(rangeError('26.09.2026', TODAY, TODAY)).toBe('missing');
    expect(rangeError('2026-09-01', '2026-09-27', TODAY)).toBe('future');
    expect(rangeError('2026-09-20', '2026-09-10', TODAY)).toBe('order');
    expect(rangeError('2019-12-31', '2020-01-05', TODAY)).toBe('tooOld');
    expect(rangeError('2025-09-25', TODAY, TODAY)).toBe('tooLong'); // 367 days
  });
});

describe('resolvePeriod', () => {
  it('is the last 30 days by default', () => {
    expect(resolvePeriod(params(''), TODAY)).toEqual({ from: '2026-08-28', to: TODAY, preset: 30 });
  });

  it('takes 7 or 90 days, and nothing else', () => {
    expect(resolvePeriod(params('days=7'), TODAY)).toEqual({ from: '2026-09-20', to: TODAY, preset: 7 });
    expect(resolvePeriod(params('days=90'), TODAY).from).toBe('2026-06-29');
    expect(resolvePeriod(params('days=5000'), TODAY).preset).toBe(30);
  });

  it('takes dates the мизоҷ picked', () => {
    expect(resolvePeriod(params('from=2026-09-01&to=2026-09-10'), TODAY)).toEqual({
      from: '2026-09-01',
      to: '2026-09-10',
      preset: null,
    });
  });

  it('never passes on dates the server would refuse', () => {
    for (const query of [
      'from=2026-09-20&to=2026-09-10',
      'from=2020-01-01&to=2026-09-26',
      'from=2026-09-01&to=2026-12-01',
      'from=2026-09-01',
      "from=2026-09-01'&to=2026-09-10",
    ]) {
      expect(resolvePeriod(params(query), TODAY)).toEqual({ from: '2026-08-28', to: TODAY, preset: 30 });
    }
  });
});

describe('change', () => {
  it('is the share of the period before', () => {
    expect(change({ current: 120, previous: 100 })).toEqual({ trend: 'up', label: '+20%' });
    expect(change({ current: 95, previous: 100 })).toEqual({ trend: 'down', label: '−5%' });
    expect(change({ current: 0, previous: 4 })).toEqual({ trend: 'down', label: '−100%' });
    expect(change({ current: 2, previous: 3 })).toEqual({ trend: 'down', label: '−33%' });
  });

  it('is the number itself when there was nothing before', () => {
    expect(change({ current: 7, previous: 0 })).toEqual({ trend: 'up', label: '+7' });
  });

  it('says nothing when both are zero', () => {
    expect(change({ current: 0, previous: 0 })).toEqual({ trend: 'same', label: null });
    expect(change({ current: 5, previous: 5 })).toEqual({ trend: 'same', label: '0%' });
  });
});

describe('percentOf', () => {
  it('is a whole percent, and nothing without a whole', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBeNull();
  });
});

describe('safeInstagramLink', () => {
  it("keeps Instagram's own https pages", () => {
    expect(safeInstagramLink('https://www.instagram.com/p/DAbc123/')).toBe('https://www.instagram.com/p/DAbc123/');
    expect(safeInstagramLink('https://instagram.com/reel/XYZ/')).toBe('https://instagram.com/reel/XYZ/');
  });

  it('drops anything else', () => {
    for (const url of [
      null,
      '',
      'javascript:alert(1)',
      'http://www.instagram.com/p/x/',
      'https://instagram.com.evil.example/p/x/',
      'https://evil.example/www.instagram.com/p/x/',
      'https://www.instagram.com@evil.example/p/x/',
      'https://user:pass@www.instagram.com/p/x/',
      '//www.instagram.com/p/x/',
      'data:text/html,hi',
    ]) {
      expect(safeInstagramLink(url)).toBeNull();
    }
  });
});

describe('safeImageSrc', () => {
  it('keeps only https pictures', () => {
    expect(safeImageSrc('https://scontent.cdninstagram.com/a.jpg')).toBe('https://scontent.cdninstagram.com/a.jpg');
    expect(safeImageSrc('http://x.example/a.jpg')).toBeNull();
    expect(safeImageSrc('javascript:alert(1)')).toBeNull();
    expect(safeImageSrc(null)).toBeNull();
  });
});
