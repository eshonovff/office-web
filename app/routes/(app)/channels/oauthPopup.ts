/**
 * Reads the result of a Meta OAuth round-trip out of a popup window, without
 * making a second HTTP request.
 *
 * Office.Api/Features/Channels/ChannelOAuthEndpoints.cs's callback is a plain
 * `GET /api/channels/oauth/{provider}/callback` that Meta redirects the bare
 * browser to — no bearer token, no HTML, just a JSON body (OAuthCallbackResponse
 * on success, a ProblemDetails on failure). Two things follow from that:
 *
 * - There's no page there to `postMessage` back to the opener, so the only way
 *   to get the JSON out is to read it directly off the popup's own DOM once
 *   navigation lands — which only works same-origin. That's why this flow
 *   requires the SPA to be served from the same origin as `Meta:RedirectBaseUrl`
 *   (already the design intent — see appsettings.json's prod value — just not
 *   finished being wired up in deploy yet).
 * - The callback's state is single-use (OAuthNonceTracker burns the nonce on
 *   first read), so re-fetching that same URL a second time to "read the
 *   response properly" would just get "State эътибор надорад" back. The DOM
 *   read has to be of the page the popup already landed on, not a fresh request.
 *
 * A full-page redirect was the other option, but there's no frontend route to
 * land on afterwards — Meta's redirect_uri points straight at the API — so it
 * would just leave the user staring at raw JSON with no way back into the app.
 * A popup keeps the SPA's own tab untouched throughout, which also means
 * neither "the user closes the popup" nor "the user hits back" can leave the
 * app in a broken state — the opener never navigated away to begin with.
 */

export interface PopupLike {
  readonly closed: boolean;
  location: { href: string };
  document: { readyState: DocumentReadyState; body: { textContent: string | null } | null } | null;
  close(): void;
}

export class OAuthPopupClosedError extends Error {
  constructor() {
    super('oauth-popup-closed');
  }
}

export class OAuthPopupParseError extends Error {
  constructor() {
    super('oauth-popup-parse-failed');
  }
}

const DEFAULT_POLL_INTERVAL_MS = 400;

/**
 * Polls `popup` until it either closes (rejects with OAuthPopupClosedError —
 * covers both an explicit close and the user hitting back far enough that
 * Meta's own flow abandons) or navigates to a same-origin URL containing
 * `callbackPathSegment` and finishes loading, at which point its body text is
 * parsed as JSON and returned. Reading `popup.location`/`popup.document`
 * throws while the popup is still on Meta's cross-origin domain — that's
 * expected and just means "keep waiting", not a failure.
 */
export function waitForOAuthPopupResult(
  popup: PopupLike,
  callbackPathSegment: string,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        reject(new OAuthPopupClosedError());
        return;
      }

      let href: string;
      let doc: PopupLike['document'];
      try {
        href = popup.location.href;
        doc = popup.document;
      } catch {
        return; // still cross-origin, on Meta's domain — not there yet
      }

      if (href === 'about:blank' || !href.includes(callbackPathSegment)) return;
      if (!doc || doc.readyState !== 'complete') return;

      clearInterval(interval);
      try {
        const text = doc.body?.textContent ?? '';
        resolve(JSON.parse(text));
      } catch {
        reject(new OAuthPopupParseError());
      } finally {
        popup.close();
      }
    }, pollIntervalMs);
  });
}
