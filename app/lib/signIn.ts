import { canAccessRoute } from '~/config/permissions';

/**
 * The shared sign-in page (/login) serves both systems with one "email or username" field.
 * A мизоҷ signs in with an email; a staff username is always a phone number in digits (or
 * "owner"), never with an "@" — so the "@" alone decides which login is called. The two
 * backends stay fully separate (own endpoints, rate limits, tokens and cookies).
 */
export function isCustomerIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

// `redirectTo` comes from the URL, so anyone can craft it: only an in-app path the account
// may actually open is followed — never another origin ("//evil.com"), never the other
// system's pages.

export function staffLandingPath(redirectTo: string | null, permissions: string[]): string {
  return redirectTo && canAccessRoute(redirectTo, permissions) ? redirectTo : '/dashboard';
}

export function customerLandingPath(redirectTo: string | null): string {
  return redirectTo && /^\/account(?:[/?#]|$)/.test(redirectTo) ? redirectTo : '/account';
}

export type SignInError = 'invalid' | 'notVerified' | 'tooMany' | 'unavailable';

/**
 * One message for a wrong login in either system, so the page never tells whether an
 * account exists. "Not verified" (403) comes only from the мизоҷ login, and only after a
 * correct password.
 */
export function signInErrorOf(error: unknown): SignInError {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 400 || status === 401) return 'invalid';
  if (status === 403) return 'notVerified';
  if (status === 429) return 'tooMany';
  return 'unavailable';
}

/**
 * The message for a failed register / verify-email call: the backend's own reason when it sent
 * one (already registered, wrong code, cooldown…), else one by status — the rate limiter and an
 * unreachable server send no body. Returns an i18n key when there is no server text.
 */
export function authFailureMessage(error: unknown): { text: string } | { key: string } {
  const response = (error as { response?: { status?: number; data?: { detail?: string } } })?.response;
  if (response?.data?.detail) return { text: response.data.detail };
  if (response?.status === 429) return { key: 'auth:errors.tooMany' };
  if (response?.status && response.status < 500) return { key: 'common:errors.unknown' };
  return { key: 'auth:errors.unavailable' };
}
