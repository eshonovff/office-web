import { redirect } from 'react-router';

// / used to BE the dashboard directly (index route) — now that the dashboard has its own tabs
// (/dashboard, /dashboard/stats), it needs a real path segment of its own to nest children under
// (an index route can't have child routes). This keeps / working as the app's landing URL.
export function clientLoader() {
  return redirect('/dashboard');
}

export default function RootRedirect() {
  return null;
}
