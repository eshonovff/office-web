import { useEffect, useState } from 'react';
import { conversationsApi } from '~/api/conversations';

type BlobKind = 'media' | 'thumbnail';
type BlobStatus = 'idle' | 'loading' | 'ready' | 'gone' | 'download-error' | 'not-found' | 'error';

interface BlobCacheEntry {
  objectUrl?: string;
  promise?: Promise<string>;
  status?: BlobStatus;
}

interface BlobUrlState {
  objectUrl: string | null;
  status: BlobStatus;
}

const blobCache = new Map<string, BlobCacheEntry>();

function cacheKey(kind: BlobKind, messageId: string, path: string) {
  return `${kind}:${messageId}:${path}`;
}

function statusFromError(error: unknown): BlobStatus {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 410) return 'gone';
  if (status === 424) return 'download-error';
  if (status === 404) return 'not-found';
  return 'error';
}

async function fetchObjectUrl(kind: BlobKind, path: string) {
  const blob = kind === 'thumbnail' ? await conversationsApi.getThumbnailBlob(path) : await conversationsApi.getMediaBlob(path);
  return URL.createObjectURL(blob);
}

export async function getMessageObjectUrl(kind: BlobKind, messageId: string, path: string): Promise<string> {
  const key = cacheKey(kind, messageId, path);
  const cached = blobCache.get(key);
  if (cached?.objectUrl) return cached.objectUrl;
  if (cached?.promise) return cached.promise;

  const promise = fetchObjectUrl(kind, path)
    .then((objectUrl) => {
      blobCache.set(key, { objectUrl, status: 'ready' });
      return objectUrl;
    })
    .catch((error: unknown) => {
      const status = statusFromError(error);
      blobCache.set(key, { status });
      throw error;
    });

  blobCache.set(key, { promise, status: 'loading' });
  return promise;
}

export function useMessageBlobUrl(kind: BlobKind, messageId: string, path: string | null | undefined): BlobUrlState {
  const [state, setState] = useState<BlobUrlState>({ objectUrl: null, status: path ? 'loading' : 'idle' });

  useEffect(() => {
    if (!path) {
      setState({ objectUrl: null, status: 'idle' });
      return;
    }

    let cancelled = false;
    const key = cacheKey(kind, messageId, path);
    const cached = blobCache.get(key);

    if (cached?.objectUrl) {
      setState({ objectUrl: cached.objectUrl, status: 'ready' });
      return;
    }
    if (cached?.status && cached.status !== 'loading') {
      setState({ objectUrl: null, status: cached.status });
      return;
    }

    const promise = getMessageObjectUrl(kind, messageId, path);
    setState({ objectUrl: null, status: 'loading' });

    promise
      .then((objectUrl) => {
        if (!cancelled) setState({ objectUrl, status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ objectUrl: null, status: statusFromError(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [kind, messageId, path]);

  return state;
}

export function revokeMessageBlobCache() {
  for (const entry of blobCache.values()) {
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
  }
  blobCache.clear();
}
