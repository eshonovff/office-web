import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthPopupClosedError, OAuthPopupParseError, waitForOAuthPopupResult, type PopupLike } from './oauthPopup';

/**
 * Mimics a real popup: while `crossOrigin` is true, reading `.location` or
 * `.document` throws — exactly what happens when the popup is still on
 * Meta's domain and the opener (a different origin) tries to read it.
 */
class FakePopup implements PopupLike {
  closed = false;
  close = vi.fn(() => {
    this.closed = true;
  });

  private crossOrigin = false;
  private _location = { href: 'about:blank' };
  private _document: PopupLike['document'] = { readyState: 'loading', body: { textContent: '' } };

  get location(): { href: string } {
    if (this.crossOrigin) throw new DOMException('cross-origin');
    return this._location;
  }

  get document(): PopupLike['document'] {
    if (this.crossOrigin) throw new DOMException('cross-origin');
    return this._document;
  }

  navigateCrossOrigin() {
    this.crossOrigin = true;
  }

  navigateToCallback(href: string, body: string, readyState: DocumentReadyState = 'complete') {
    this.crossOrigin = false;
    this._location = { href };
    this._document = { readyState, body: { textContent: body } };
  }

  /** about:blank finishing its (instant) load — still shouldn't be mistaken for the callback. */
  markBlankPageLoaded() {
    this._document = { readyState: 'complete', body: { textContent: '' } };
  }
}

function makeFakePopup(): FakePopup {
  return new FakePopup();
}

describe('waitForOAuthPopupResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps waiting while the popup is still cross-origin on Meta', async () => {
    const popup = makeFakePopup();
    popup.navigateCrossOrigin();

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    await vi.advanceTimersByTimeAsync(2000);

    // Still pending — resolve it now so the test can finish cleanly.
    popup.navigateToCallback('https://app.test/api/channels/oauth/instagram/callback?code=1', '{"connectionId":"c1","accounts":[]}');
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toEqual({ connectionId: 'c1', accounts: [] });
  });

  it('ignores about:blank before the popup has navigated anywhere', async () => {
    const popup = makeFakePopup();
    popup.markBlankPageLoaded();

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    await vi.advanceTimersByTimeAsync(400);

    popup.navigateToCallback('https://app.test/api/channels/oauth/instagram/callback?code=1', '{"connectionId":"c1","accounts":[]}');
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toEqual({ connectionId: 'c1', accounts: [] });
  });

  it('resolves with the parsed JSON once the callback URL is reached and fully loaded, and closes the popup', async () => {
    const popup = makeFakePopup();
    popup.navigateToCallback(
      'https://app.test/api/channels/oauth/facebook/callback?code=1&state=2',
      '{"connectionId":"c1","accounts":[{"externalId":"p1","name":"My Page"}]}'
    );

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toEqual({ connectionId: 'c1', accounts: [{ externalId: 'p1', name: 'My Page' }] });
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it('waits for the document to finish loading before reading it', async () => {
    const popup = makeFakePopup();
    popup.navigateToCallback('https://app.test/api/channels/oauth/instagram/callback?code=1', '', 'loading');

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    await vi.advanceTimersByTimeAsync(800);
    expect(popup.close).not.toHaveBeenCalled();

    popup.navigateToCallback('https://app.test/api/channels/oauth/instagram/callback?code=1', '{"connectionId":"c1","accounts":[]}');
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toEqual({ connectionId: 'c1', accounts: [] });
  });

  it('rejects with OAuthPopupClosedError when the user closes the popup before completing', async () => {
    const popup = makeFakePopup();
    popup.navigateCrossOrigin();

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    // Attach the rejection assertion before advancing timers, so the rejection
    // (fired synchronously inside the timer callback below) is never briefly
    // unhandled between the reject() call and this assertion picking it up.
    const assertion = expect(promise).rejects.toBeInstanceOf(OAuthPopupClosedError);
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(400);

    await assertion;
  });

  it('rejects with OAuthPopupParseError and still closes the popup when the body is not valid JSON', async () => {
    const popup = makeFakePopup();
    popup.navigateToCallback('https://app.test/api/channels/oauth/instagram/callback?code=1', 'not json');

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    const assertion = expect(promise).rejects.toBeInstanceOf(OAuthPopupParseError);
    await vi.advanceTimersByTimeAsync(400);

    await assertion;
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it('resolves a ProblemDetails-shaped error body just as readily as a success body — the caller distinguishes them', async () => {
    const popup = makeFakePopup();
    popup.navigateToCallback(
      'https://app.test/api/channels/oauth/instagram/callback?error=access_denied',
      '{"title":"Корбар авторизатсияро рад кард","detail":"user denied","status":400}'
    );

    const promise = waitForOAuthPopupResult(popup, '/channels/oauth/');
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toEqual({ title: 'Корбар авторизатсияро рад кард', detail: 'user denied', status: 400 });
  });
});
