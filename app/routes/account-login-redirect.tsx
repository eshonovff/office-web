import { redirect } from 'react-router';
import type { Route } from './+types/account-login-redirect';

// The old мизоҷ sign-in address (bookmarks, links in emails). Everyone signs in at /login now.
export function clientLoader({ request }: Route.ClientLoaderArgs) {
  return redirect(`/login${new URL(request.url).search}`);
}

export default function AccountLoginRedirect() {
  return null;
}
