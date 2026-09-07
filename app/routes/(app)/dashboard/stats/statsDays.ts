import { STATS_DAYS_OPTIONS, type StatsDays } from '~/types/dashboardStats';

const DEFAULT_DAYS: StatsDays = 14;

/** Pure so it's testable without mounting the page — an invalid/missing ?days= silently falls back to the default instead of sending the backend a value it 400s on. */
export function resolveStatsDays(searchParams: URLSearchParams): StatsDays {
  const raw = searchParams.get('days');
  const parsed = raw ? Number(raw) : NaN;
  return (STATS_DAYS_OPTIONS as readonly number[]).includes(parsed) ? (parsed as StatsDays) : DEFAULT_DAYS;
}
