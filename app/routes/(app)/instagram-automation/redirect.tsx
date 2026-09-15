import { redirect } from 'react-router';

// /instagram-automation moved to /automations (unified simple+flow list, Фазаи 12) —
// this keeps old links/bookmarks working instead of 404ing.
export function clientLoader({ request }: { request: Request }) {
  const search = new URL(request.url).search;
  return redirect(`/automations${search}`);
}

export default function InstagramAutomationRedirect() {
  return null;
}
