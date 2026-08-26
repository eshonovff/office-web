import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthPopupClosedError, waitForOAuthPopupResult, type PopupLike } from './oauthPopup';

class FakePopup implements PopupLike {
  closed = false;
  location = { href: 'about:blank' };
  close = vi.fn(() => {
    this.closed = true;
  });
}

function postMessageFrom(source: unknown, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data, source } as MessageEventInit));
}

describe('waitForOAuthPopupResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the message payload once the popup itself posts an office-oauth-callback message', async () => {
    const popup = new FakePopup();

    const promise = waitForOAuthPopupResult(popup);
    postMessageFrom(popup, { source: 'office-oauth-callback', payload: { connectionId: 'c1', accounts: [] } });

    await expect(promise).resolves.toEqual({ connectionId: 'c1', accounts: [] });
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it('ignores a message from a window other than the popup it was told to watch', async () => {
    const popup = new FakePopup();
    const someOtherWindow = {};

    const promise = waitForOAuthPopupResult(popup);
    postMessageFrom(someOtherWindow, { source: 'office-oauth-callback', payload: { ok: true } });

    // Still pending — resolve it for real now so the test can finish cleanly.
    postMessageFrom(popup, { source: 'office-oauth-callback', payload: { done: true } });
    await expect(promise).resolves.toEqual({ done: true });
  });

  it('ignores a same-source message that is not shaped like an OAuth callback message', async () => {
    const popup = new FakePopup();

    const promise = waitForOAuthPopupResult(popup);
    postMessageFrom(popup, { source: 'some-unrelated-thing', payload: { ok: true } });
    postMessageFrom(popup, 'not even an object');

    postMessageFrom(popup, { source: 'office-oauth-callback', payload: { done: true } });
    await expect(promise).resolves.toEqual({ done: true });
  });

  it('rejects with OAuthPopupClosedError once the popup closes without ever posting a message', async () => {
    const popup = new FakePopup();

    const promise = waitForOAuthPopupResult(popup);
    const assertion = expect(promise).rejects.toBeInstanceOf(OAuthPopupClosedError);
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(400);

    await assertion;
  });

  it('stops listening after resolving, so a late message from the same popup is a no-op', async () => {
    const popup = new FakePopup();

    const promise = waitForOAuthPopupResult(popup);
    postMessageFrom(popup, { source: 'office-oauth-callback', payload: { first: true } });
    await expect(promise).resolves.toEqual({ first: true });

    // Should not throw, warn, or resolve/reject anything a second time.
    expect(() => postMessageFrom(popup, { source: 'office-oauth-callback', payload: { second: true } })).not.toThrow();
  });
});
