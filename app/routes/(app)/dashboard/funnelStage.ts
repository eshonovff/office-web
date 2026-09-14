// The backend's funnel.data[].stage is raw hardcoded Tajik text (DashboardStatsQueryService:
// "Омад" / "Ҷавоб гирифт" / "Баста шуд"), not a stable code/key the way failureCode is — there was
// nothing else to key off of. This maps those exact strings to i18n keys so a Russian-locale user
// doesn't see Tajik words baked into an otherwise-translated chart; a stage the backend didn't
// send yet (or renamed) falls back to showing the raw string as-is rather than disappearing.
const STAGE_KEYS: Record<string, string> = {
  Омад: 'stageArrived',
  'Ҷавоб гирифт': 'stageResponded',
  'Баста шуд': 'stageClosed',
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function translateFunnelStage(t: TranslateFn, stage: string): string {
  const key = STAGE_KEYS[stage];
  return key ? t(`stats.funnel.${key}`, { ns: 'dashboard' }) : stage;
}
