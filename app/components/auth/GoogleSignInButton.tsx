import { useEffect, useRef } from 'react';
import { loadScript } from '~/lib/loadScript';

// Google's own type isn't published as a lightweight package worth adding — this is the
// minimal shape Google Identity Services actually exposes on window.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  onIdToken: (idToken: string) => void;
}

// Renders Google's own official branded button (their logo, their layout) — not a
// hand-drawn one, both to match their brand guidelines and to stay correct as they evolve it.
export function GoogleSignInButton({ onIdToken }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onIdTokenRef = useRef(onIdToken);
  onIdTokenRef.current = onIdToken;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadScript('https://accounts.google.com/gsi/client').then(() => {
      if (cancelled || !window.google || !containerRef.current) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onIdTokenRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex w-full justify-center" />;
}
