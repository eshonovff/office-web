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
