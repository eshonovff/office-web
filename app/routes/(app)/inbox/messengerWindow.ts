import dayjs, { type Dayjs } from 'dayjs';

/**
 * Facebook/Instagram (Messenger Platform) — unlike WhatsApp — have no
 * templates. Instead there's a "message tag": once the normal 24h window
 * closes, the HUMAN_AGENT tag lets a reply through for up to 7 days from the
 * customer's last message. There's no operator choice involved — no
 * template to pick, nothing to configure — the backend applies it
 * automatically (Office.Api's MessengerSendModePlanner/WhatsAppSendJob) once
 * the send job actually runs, so this is purely informational: it explains
 * what will happen, and blocks the send attempt once nothing would work.
 *
 * Mirrors MessengerSendModePlanner.Plan exactly: `windowExpiresAt` is
 * already "last inbound message + 24h" for every channel type
 * (ConversationWindowCalculator.ComputeExpiresAt), so the 7-day mark is
 * that same value plus 6 more days — no extra field needed.
 */
export type MessengerSendMode = 'plain' | 'tag' | 'reject';

const TAG_EXTENSION_DAYS = 6;

export function getMessengerSendMode(windowExpiresAt: string | null, now: Dayjs = dayjs()): MessengerSendMode {
  if (!windowExpiresAt) return 'plain';

  const expiresAt = dayjs(windowExpiresAt);
  if (expiresAt.isAfter(now)) return 'plain';

  const tagDeadline = expiresAt.add(TAG_EXTENSION_DAYS, 'day');
  return now.isAfter(tagDeadline) ? 'reject' : 'tag';
}
