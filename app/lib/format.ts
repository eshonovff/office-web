import dayjs from 'dayjs';
import i18next from 'i18next';

const numberLocales = { tg: 'tg-TJ', ru: 'ru-RU' } as const;

export function fmtTJS(v: number): string {
  const locale = numberLocales[i18next.language as keyof typeof numberLocales] ?? numberLocales.tg;
  return `${v.toLocaleString(locale)} TJS`;
}

export function fmtTime(s: string): string {
  return s.slice(0, 5);
}
export function formatDate(date: string | Date | null | undefined, withTime = false): string {
  if (!date) return '—';
  const fmt = withTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY';
  return dayjs(date).format(fmt);
}

// dayjs ships no Tajik locale, so `.fromNow()` would silently fall back to
// English — same reasoning as fmtTJS/formatDate above. Built by hand with
// plain {{count}} interpolation (no i18next plural-suffix keys), matching
// the rest of this app's i18n convention (see e.g. validation.json's
// stringMax) rather than relying on CLDR plural rules Tajik doesn't have.
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const target = dayjs(date);
  const now = dayjs();

  const minutes = now.diff(target, 'minute');
  if (minutes < 1) return i18next.t('relativeTime.justNow', { ns: 'common' });
  if (minutes < 60) return i18next.t('relativeTime.minutesAgo', { ns: 'common', count: minutes });

  const hours = now.diff(target, 'hour');
  if (hours < 24) return i18next.t('relativeTime.hoursAgo', { ns: 'common', count: hours });

  const days = now.diff(target, 'day');
  if (days < 7) return i18next.t('relativeTime.daysAgo', { ns: 'common', count: days });

  return formatDate(date);
}

/**
 * Formats a WhatsApp conversation's externalId for display — the WhatsApp
 * Cloud API sends the customer's number as raw E.164 digits with no `+`
 * (see office-api's WhatsAppPayloadParser.cs, the webhook's `from` field).
 * Tajik numbers (992 + 9 digits) get the local grouping (+992 XX XXX XX XX);
 * any other length/prefix — a foreign customer's number — just gets a
 * leading `+`, since there's no general phone-number library on the
 * frontend to group it correctly.
 */
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('992') && digits.length === 12) {
    return `+992 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return raw.startsWith('+') ? raw : `+${digits || raw}`;
}

/** Null when the window is already closed (or never opened) — nothing to count down. */
export function formatWindowRemaining(windowExpiresAt: string | null | undefined): string | null {
  if (!windowExpiresAt) return null;
  const target = dayjs(windowExpiresAt);
  const now = dayjs();
  if (!target.isAfter(now)) return null;

  const totalMinutes = target.diff(now, 'minute');
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return i18next.t('windowRemainingHours', { ns: 'inbox', hours, minutes });
  return i18next.t('windowRemainingMinutes', { ns: 'inbox', count: minutes });
}
