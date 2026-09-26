import type { BroadcastListItem, BroadcastStatus } from '~/types/customerBroadcasts';

export const STATUS_VARIANT: Record<BroadcastStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Scheduled: 'outline',
  Sending: 'default',
  Finished: 'secondary',
  Cancelled: 'outline',
  Failed: 'destructive',
};

/** Still to happen or happening — the page keeps refreshing while any is. */
export const isOpen = (status: BroadcastStatus) => status === 'Scheduled' || status === 'Sending';

/** How far a sending broadcast has got, 0–100. */
export function progress(b: BroadcastListItem): number {
  if (b.recipients === 0) return 0;
  return Math.round(((b.sent + b.failed + b.skipped) / b.recipients) * 100);
}

/** Accounts with a broadcast sending right now — the others of that account wait for it. */
export const sendingAccounts = (broadcasts: BroadcastListItem[]) =>
  new Set(broadcasts.filter((b) => b.status === 'Sending').map((b) => b.channelId));
