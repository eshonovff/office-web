import { useState } from 'react';
import { cn } from '~/lib/utils';

interface ContactAvatarProps {
  name: string;
  url: string | null;
  className?: string;
}

// Instagram profile pictures are CDN links that expire; when one no longer loads, the initial shows.
export function ContactAvatar({ name, url, className }: ContactAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.replace(/^@/, '').charAt(0).toUpperCase() || '?';

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold',
        className
      )}>
      {url && !failed ? (
        <img
          src={url}
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
