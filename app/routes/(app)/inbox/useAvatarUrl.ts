import { useEffect, useState } from 'react';
import { type InboxApi, useInboxApi } from './inboxApi';
import { getMessageObjectUrl } from './useMessageBlobUrl';

/**
 * A contact's picture: our server's own copy (Meta's link stops working after ~4 days), fetched
 * with the caller's token like any message media and kept for the page's life. Null until it
 * arrives, or when there is none — the initial shows then. Only our own /api/… paths are ever
 * fetched: a token never goes to another address.
 */
export function useAvatarUrl(path: string | null | undefined, api?: InboxApi): string | null {
  const contextApi = useInboxApi();
  const source = api ?? contextApi;
  const ours = path?.startsWith('/api/') ? path : null;
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!ours) return;
    let alive = true;
    getMessageObjectUrl('thumbnail', 'avatar', ours, source).then(
      (url) => {
        if (alive) setLoaded({ path: ours, url });
      },
      () => undefined // no picture: the initial stays
    );
    return () => {
      alive = false;
    };
  }, [ours, source]);

  return ours && loaded?.path === ours ? loaded.url : null;
}
