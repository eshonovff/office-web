import type { AnalyticsCount, AnalyticsRange } from '~/types/customerAnalytics';

export const PERIOD_PRESETS = [7, 30, 90] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export const DEFAULT_PRESET: PeriodPreset = 30;

// The server's own limits (AnalyticsPeriod): at most 366 days, not before 2020, never in the future.
// Checked here too, so a wrong range is explained next to the dates instead of refused by the server.
export const MAX_DAYS = 366;
export const EARLIEST_DATE = '2020-01-01';

const DUSHANBE_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Dushanbe ('YYYY-MM-DD') — the server counts Dushanbe days, whatever the browser's time zone. */
export function dushanbeToday(now: number = Date.now()): string {
  return new Date(now + DUSHANBE_OFFSET_MS).toISOString().slice(0, 10);
}

const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Both ends counted — one day is 1. */
export function dayCount({ from, to }: AnalyticsRange): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

function isDate(value: string | null): value is string {
  if (!value || !DATE_FORMAT.test(value)) return false;
  const time = toUtc(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value; // not 2026-02-30
}

export type RangeError = 'missing' | 'future' | 'order' | 'tooOld' | 'tooLong';

/** Why these dates can't be a period (a key of analytics.period.errors), or null when they can. */
export function rangeError(from: string | null, to: string | null, today: string): RangeError | null {
  if (!isDate(from) || !isDate(to)) return 'missing';
  if (to > today) return 'future';
  if (from > to) return 'order';
  if (from < EARLIEST_DATE) return 'tooOld';
  if (dayCount({ from, to }) > MAX_DAYS) return 'tooLong';
  return null;
}

export interface Period extends AnalyticsRange {
  /** Null — dates the мизоҷ picked. */
  preset: PeriodPreset | null;
}

export function presetRange(preset: PeriodPreset, today: string): AnalyticsRange {
  return { from: addDays(today, -(preset - 1)), to: today };
}

/** The period in the URL (?days= or ?from=&to=). Anything the server would refuse is the last 30 days. */
export function resolvePeriod(params: URLSearchParams, today: string): Period {
  const from = params.get('from');
  const to = params.get('to');
  if (from !== null && to !== null && rangeError(from, to, today) === null) return { from, to, preset: null };

  const days = Number(params.get('days'));
  const preset = PERIOD_PRESETS.find((p) => p === days) ?? DEFAULT_PRESET;
  return { ...presetRange(preset, today), preset };
}

/** The same number of days just before — what every number is compared with. */
export function previousRange(range: AnalyticsRange): AnalyticsRange {
  return { from: addDays(range.from, -dayCount(range)), to: addDays(range.from, -1) };
}

export type Trend = 'up' | 'down' | 'same';

export interface Change {
  trend: Trend;
  /** "+12%", "−5%", "0%"; "+7" when there was nothing before (no share of zero); null when both are zero. */
  label: string | null;
}

export function change({ current, previous }: AnalyticsCount): Change {
  if (current === previous) return { trend: 'same', label: current === 0 ? null : '0%' };
  const trend: Trend = current > previous ? 'up' : 'down';
  if (previous === 0) return { trend, label: `+${current}` };
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  return { trend, label: `${trend === 'up' ? '+' : '−'}${percent}%` };
}

/** Whole percent of `part` in `whole`; null when there is no whole to take a share of. */
export function percentOf(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);

/** A post's link only when it is Instagram's own https page — never another site, never a script. */
export function safeInstagramLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const isInstagram = parsed.protocol === 'https:' && INSTAGRAM_HOSTS.has(parsed.hostname);
    return isInstagram && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

/** A picture's address only over https (Instagram's own are). */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
