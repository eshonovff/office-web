// Mirrors office-api/Office.Api/Channels/FailureCodeLabels.cs exactly (same codes, same
// exact-vs-suffix distinction) — that backend map is log-only Tajik text, not sent over the API
// (see FailedMessageGroup — only `failureCode` crosses the wire). This is the frontend's own
// translation of the same codes, bilingual (tg/ru via i18next), shared by the Overview tab's
// failedMessages card and the Stats tab's failureBreakdown chart — one place, not two copies.
const EXACT_CODES = ['FB_100_2018074', 'IG_2'] as const;
const SUFFIX_CODES = ['_131030', '_190', '_131047', '_470'] as const;

const PROVIDER_NAMES: Record<string, string> = { IG: 'Instagram', FB: 'Facebook', WA: 'WhatsApp' };

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Never returns the raw code alone for an unrecognized one — always "unknown error for <provider> (<code>)", so an operator always has enough to search/report it. */
export function translateFailureCode(t: TranslateFn, failureCode: string | null): string {
  if (!failureCode) return t('failureCode.none', { ns: 'dashboard' });

  if ((EXACT_CODES as readonly string[]).includes(failureCode)) {
    return t(`failureCode.exact.${failureCode}`, { ns: 'dashboard' });
  }

  const suffix = SUFFIX_CODES.find((s) => failureCode.endsWith(s));
  if (suffix) {
    return t(`failureCode.suffix.${suffix}`, { ns: 'dashboard' });
  }

  const prefix = failureCode.split('_')[0] ?? failureCode;
  const provider = PROVIDER_NAMES[prefix] ?? prefix;
  return t('failureCode.unknown', { ns: 'dashboard', provider, code: failureCode });
}
