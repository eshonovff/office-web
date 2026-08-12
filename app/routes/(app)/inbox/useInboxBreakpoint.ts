import { useIsMobile } from '~/hooks/use-mobile';

export type InboxBreakpoint = 'mobile' | 'tablet' | 'desktop';

export const INBOX_TABLET_BREAKPOINT = 768;
export const INBOX_DESKTOP_BREAKPOINT = 1280;

export function getInboxBreakpoint(isBelowTablet: boolean, isBelowDesktop: boolean): InboxBreakpoint {
  if (isBelowTablet) return 'mobile';
  if (isBelowDesktop) return 'tablet';
  return 'desktop';
}

/**
 * Three-tier layout, Telegram-style:
 * - mobile (<768px): one pane visible at a time (list / thread / info)
 * - tablet (768-1279px): list + thread side by side, info panel as a pushed overlay
 * - desktop (>=1280px): all three panes side by side (current behavior)
 */
export function useInboxBreakpoint(): InboxBreakpoint {
  const isBelowTablet = useIsMobile(INBOX_TABLET_BREAKPOINT);
  const isBelowDesktop = useIsMobile(INBOX_DESKTOP_BREAKPOINT);
  return getInboxBreakpoint(isBelowTablet, isBelowDesktop);
}
