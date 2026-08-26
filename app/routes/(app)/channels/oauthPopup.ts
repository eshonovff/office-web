/**
 * Reads the result of a Meta OAuth round-trip out of a popup window via
 * `window.postMessage` — the standard OAuth-popup pattern.
 *
 * Office.Api/Features/Channels/ChannelOAuthEndpoints.cs's callback (the page
 * Meta redirects the popup to, with no bearer token — it's a bare browser
 * redirect) renders a tiny self-closing page (see OAuthPostMessagePage.cs)
 * instead of returning raw JSON, specifically so this works no matter what
 * origin the SPA itself is served from — dev tunnel, prod, doesn't matter,
 * since postMessage crosses origins by design.
 *
 * (An earlier version of this read the popup's DOM directly instead, which
 * only worked when the SPA and Meta:RedirectBaseUrl happened to share an
 * origin — true in the eventual prod deploy, but not in dev, where the SPA
 * runs on localhost:3000 while the tunnel is a separate domain entirely.)
 *
 * `popup.closed`, `.postMessage()` and `.close()` are exempt from the
 * Same-Origin Policy (unlike reading `.location`/`.document`, calling them
 * is always allowed cross-origin) — that's what makes detecting an
 * abandoned popup possible without needing to read anything off it.
 */

export interface PopupLike {
  readonly closed: boolean;
  location: { href: string };
  close(): void;
}

export class OAuthPopupClosedError extends Error {
  constructor() {
    super('oauth-popup-closed');
  }
}

const MESSAGE_SOURCE = 'office-oauth-callback';
const DEFAULT_CLOSED_CHECK_INTERVAL_MS = 400;

function isOAuthPostMessage(data: unknown): data is { source: typeof MESSAGE_SOURCE; payload: unknown } {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === MESSAGE_SOURCE;
}

/**
 * Resolves with the payload of the first office-oauth-callback message whose
 * `event.source` is `popup` — checked by identity (the exact window this
 * flow itself opened), not by `event.origin`, since no other page could ever
 * hold a reference to that same window object to spoof it. Rejects with
 * OAuthPopupClosedError if the popup closes first — covers both the user
 * closing it directly and abandoning Meta's own flow until it self-closes
 * (e.g. an app-restricted account that never reaches the point of redirecting
 * back at all).
 */
export function waitForOAuthPopupResult(popup: PopupLike, closedCheckIntervalMs = DEFAULT_CLOSED_CHECK_INTERVAL_MS): Promise<unknown> {
  return new Promise((resolve, reject) => {
    function cleanup() {
      window.removeEventListener('message', onMessage);
      clearInterval(closedCheck);
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== popup || !isOAuthPostMessage(event.data)) return;
      cleanup();
      popup.close();
      resolve(event.data.payload);
    }

    const closedCheck = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new OAuthPopupClosedError());
      }
    }, closedCheckIntervalMs);

    window.addEventListener('message', onMessage);
  });
}
