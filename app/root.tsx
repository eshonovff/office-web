import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import type { Route } from './+types/root';
import { ThemeProvider } from '~/components/theme-provider';
import { ToasterProvider } from '~/components/layout/ToasterProvider';
import { Splash } from '~/components/layout/Splash';
import { Button } from '~/components/ui/button';
import { ServerUnreachableError } from '~/lib/authFailure';
import { getQueryClient } from '~/lib/query-client';
import '@fontsource-variable/manrope';
import './styles/global.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <html lang="tg" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
            <ToasterProvider />
          </ThemeProvider>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/brand/icon-192.png' },
  { rel: 'apple-touch-icon', href: '/brand/apple-touch-icon.png' },
];

export default function App() {
  const { t } = useTranslation('common');
  // React 19 hoists <title> into <head>; the brand name comes from the locale files like all text.
  return (
    <>
      <title>{t('brand')}</title>
      <Outlet />
    </>
  );
}

export function HydrateFallback() {
  return <Splash />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation('common');
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  // Thrown by the (app)/(account) layouts when the API can't be reached — the session is
  // most likely fine, so offer a retry instead of pretending the user was logged out.
  const isUnreachable = error instanceof ServerUnreachableError;

  const title = is404 ? t('notFound.title') : isUnreachable ? t('serverUnreachable.title') : t('genericError.title');
  const description = is404
    ? t('notFound.description')
    : isUnreachable
      ? t('serverUnreachable.description')
      : t('genericError.description');
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
      {isUnreachable && (
        <Button className="mt-2" onClick={() => window.location.reload()}>
          {t('serverUnreachable.retry')}
        </Button>
      )}
      {stack && !isUnreachable && (
        <pre className="mt-4 w-full max-w-2xl overflow-x-auto rounded-lg border p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
