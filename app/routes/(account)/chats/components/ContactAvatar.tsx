import { useState } from 'react';
import { cn } from '~/lib/utils';
import { useAvatarUrl } from '~/routes/(app)/inbox/useAvatarUrl';
import { customerInboxApi } from '../customerInboxApi';

interface ContactAvatarProps {
  name: string;
  url: string | null;
  className?: string;
}

// The server's own copy of the picture, fetched with the мизоҷ's token (a link to /api/public/…);
// until it arrives, when there is none, or if it fails to show — the initial.
export function ContactAvatar({ name, url, className }: ContactAvatarProps) {
  const src = useAvatarUrl(url, customerInboxApi);
  const [failed, setFailed] = useState(false);
  const initial = name.replace(/^@/, '').charAt(0).toUpperCase() || '?';

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold',
        className
      )}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}
