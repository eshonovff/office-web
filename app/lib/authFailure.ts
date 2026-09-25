/**
 * Whether an auth call failed because the session is really over (the server answered 401/403)
 * — as opposed to the server being unreachable, restarting or erroring (no response, 5xx).
 * Only the first may log anyone out: a deploy or a network blip must not end every session.
 */
export function isSessionRejected(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403;
}

/**
 * Thrown by the layout loaders when the server can't be reached even after retrying. The root
 * ErrorBoundary shows it as "server unavailable — try again", never as the login page: the
 * session (refresh cookie) is most likely still fine.
 */
export class ServerUnreachableError extends Error {
  constructor(cause?: unknown) {
    super('Server unreachable', { cause });
    this.name = 'ServerUnreachableError';
  }
}

/**
 * Runs an auth step, retrying while the server is unreachable (a restart takes a few seconds).
 * A session rejection is final and rethrown at once.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1500): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (isSessionRejected(error) || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

/**
 * Serialises refreshes across browser tabs (Web Locks API). The refresh token rotates on every
 * use and its cookie is shared by all tabs, so two tabs refreshing at the same moment would both
 * send the same token — the second is refused and that tab gets logged out. Waiting for the
 * other tab instead means this one sends the already-rotated cookie. Browsers without Web Locks
 * (and tests) just run it.
 */
export async function withCrossTabLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? await locks.request(name, fn) : fn();
}
