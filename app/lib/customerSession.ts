/**
 * Leaves the мизоҷ area with a full page load of the landing page, like the staff logout
 * (client.ts). Soft navigation + clearing the store raced React's transition: the account page
 * was still mounted when the session was wiped, its queries refetched, got a 401, and the user
 * landed on /login instead. A full load leaves nothing to race — the access token only
 * ever lived in memory, and the server already dropped the refresh cookie.
 */
export function leaveCustomerArea(notice?: 'accountDeleted'): void {
  window.location.replace(notice ? `/?${notice}=1` : '/');
}
