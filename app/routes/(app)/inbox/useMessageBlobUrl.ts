import axios, { type AxiosProgressEvent } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { conversationsApi } from '~/api/conversations';

type BlobKind = 'media' | 'thumbnail';
/** The terminal-failure subset shared between the auto hook and the gated one — neither ever resolves an error to 'loading'/'downloading'/'idle'/'ready'. */
type BlobErrorStatus = 'gone' | 'download-error' | 'not-found' | 'error';
type BlobStatus = 'idle' | 'loading' | 'ready' | BlobErrorStatus;

interface BlobCacheEntry {
  objectUrl?: string;
  promise?: Promise<string>;
  status?: BlobStatus;
}

interface BlobUrlState {
  objectUrl: string | null;
  status: BlobStatus;
}

export interface BlobUrlResult extends BlobUrlState {
  /** Clears this blob's cache entry and re-fetches — for a transient error (network blip
   * fetching our own server) this succeeds; for a permanent server-side failure
   * (message.mediaDownloadError, surfaced as a 424) it just asks again and gets the same
   * answer back, since there's no backend endpoint yet to re-enqueue that download job. */
  retry: () => void;
}

const blobCache = new Map<string, BlobCacheEntry>();

function cacheKey(kind: BlobKind, messageId: string, path: string) {
  return `${kind}:${messageId}:${path}`;
}

function statusFromError(error: unknown): BlobErrorStatus {
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

export function useMessageBlobUrl(kind: BlobKind, messageId: string, path: string | null | undefined): BlobUrlResult {
  const [state, setState] = useState<BlobUrlState>({ objectUrl: null, status: path ? 'loading' : 'idle' });
  // Bumped by retry() to force the effect below to run again — clearing the
  // cache alone wouldn't do that, since [kind, messageId, path] wouldn't
  // have changed.
  const [attempt, setAttempt] = useState(0);

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
  }, [kind, messageId, path, attempt]);

  function retry() {
    if (path) blobCache.delete(cacheKey(kind, messageId, path));
    setAttempt((a) => a + 1);
  }

  return { ...state, retry };
}

export interface DownloadProgress {
  loaded: number;
  /** Null when the server didn't send Content-Length — an indeterminate ring, not a broken one. */
  total: number | null;
}

export type GatedMediaStatus = 'idle' | 'downloading' | 'ready' | BlobErrorStatus;

export interface GatedMediaResult {
  status: GatedMediaStatus;
  objectUrl: string | null;
  progress: DownloadProgress | null;
  /** No-op if already downloading or ready — clicking Download twice must not start a second fetch. */
  start: () => void;
  cancel: () => void;
  retry: () => void;
}

/**
 * Telegram-style gated download for media that shows a player once fetched (video/audio/file):
 * unlike useMessageBlobUrl, this never fetches on mount — only on start(), and reports real
 * progress along the way (only possible for THIS fetch, browser <- our own server; the earlier
 * server-side leg, our backend <- Meta's CDN, has no byte-level progress to report at all, see
 * ServerMediaState/'pending').
 */
export function useGatedMediaDownload(messageId: string, path: string | null | undefined): GatedMediaResult {
  const [state, setState] = useState<{ status: GatedMediaStatus; objectUrl: string | null; progress: DownloadProgress | null }>(() => {
    const cached = path ? blobCache.get(cacheKey('media', messageId, path)) : undefined;
    if (cached?.objectUrl) return { status: 'ready', objectUrl: cached.objectUrl, progress: null };
    return { status: 'idle', objectUrl: null, progress: null };
  });
  // Guards start() re-entrancy imperatively — state.status lags behind synchronous double-calls
  // (e.g. a double-click within the same tick sees the SAME pre-update 'idle' status twice,
  // React state updates aren't visible until the next render) — abortRef is not.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const cached = path ? blobCache.get(cacheKey('media', messageId, path)) : undefined;
    setState(cached?.objectUrl ? { status: 'ready', objectUrl: cached.objectUrl, progress: null } : { status: 'idle', objectUrl: null, progress: null });
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [messageId, path]);

  function start() {
    if (!path || abortRef.current) return;
    const key = cacheKey('media', messageId, path);
    const cached = blobCache.get(key);
    if (cached?.objectUrl) {
      setState({ status: 'ready', objectUrl: cached.objectUrl, progress: null });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'downloading', objectUrl: null, progress: { loaded: 0, total: null } });

    conversationsApi
      .getMediaBlob(path, {
        signal: controller.signal,
        onDownloadProgress: (event: AxiosProgressEvent) =>
          setState((s) => (s.status === 'downloading' ? { ...s, progress: { loaded: event.loaded, total: event.total ?? null } } : s)),
      })
      .then((blob) => {
        abortRef.current = null;
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(key, { objectUrl, status: 'ready' });
        setState({ status: 'ready', objectUrl, progress: null });
      })
      .catch((error: unknown) => {
        const wasCancelled = axios.isCancel(error) || controller.signal.aborted;
        abortRef.current = null;
        if (wasCancelled) {
          setState({ status: 'idle', objectUrl: null, progress: null });
          return;
        }
        const status = statusFromError(error);
        blobCache.set(key, { status });
        setState({ status, objectUrl: null, progress: null });
      });
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function retry() {
    if (path) blobCache.delete(cacheKey('media', messageId, path));
    start();
  }

  return { ...state, start, cancel, retry };
}

export function revokeMessageBlobCache() {
  for (const entry of blobCache.values()) {
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
  }
  blobCache.clear();
}
