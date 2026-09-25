import { cn } from '~/lib/utils';
import type { ChannelType } from '~/types/conversation';

// The networks' own logos, in their colours (public/logos), so where a chat came from is seen at
// a glance. Kept as the brands ship them — Meta's brand rules do not allow recolouring.
const CHANNEL_LOGO_SRC: Record<ChannelType, string> = {
  Instagram: '/logos/instagram.svg',
  Facebook: '/logos/facebook.svg',
  WhatsApp: '/logos/whatsapp.svg',
};

interface ChannelLogoProps {
  type: ChannelType;
  /** Read out by screen readers; leave empty when the channel's name is written next to it. */
  label?: string;
  className?: string;
}

export function ChannelLogo({ type, label = '', className }: ChannelLogoProps) {
  return (
    <img
      src={CHANNEL_LOGO_SRC[type]}
      alt={label}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={cn('size-4 shrink-0 select-none', className)}
    />
  );
}
