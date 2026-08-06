import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import type { Route } from './+types/root';
import { ThemeProvider } from '~/components/theme-provider';
import { ToasterProvider } from '~/components/layout/ToasterProvider';
import { Splash } from '~/components/layout/Splash';
import { getQueryClient } from '~/lib/query-client';
import '@fontsource-variable/manrope';
import './styles/global.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <html lang="tg" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <Splash />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation('common');
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const title = is404 ? t('notFound.title') : t('genericError.title');
  const description = is404 ? t('notFound.description') : t('genericError.description');
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
      {stack && (
        <pre className="mt-4 w-full max-w-2xl overflow-x-auto rounded-lg border p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
