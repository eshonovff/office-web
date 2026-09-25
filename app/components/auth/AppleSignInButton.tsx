import { useEffect, useRef } from 'react';
import { loadScript } from '~/lib/loadScript';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
      };
    };
  }
}

interface AppleIdSignInSuccessEvent extends Event {
  detail: { authorization: { id_token: string } };
}

const CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
const REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;

interface AppleSignInButtonProps {
  onIdToken: (idToken: string) => void;
}

// Renders Apple's own official branded button via their JS SDK (the div below with
// id="appleid-signin" is what it looks for) — same reasoning as GoogleSignInButton.
export function AppleSignInButton({ onIdToken }: AppleSignInButtonProps) {
  const onIdTokenRef = useRef(onIdToken);
  onIdTokenRef.current = onIdToken;

  useEffect(() => {
    if (!CLIENT_ID || !REDIRECT_URI) return;
    let cancelled = false;

    const handleSuccess = (event: Event) => {
      const idToken = (event as AppleIdSignInSuccessEvent).detail?.authorization?.id_token;
      if (idToken) onIdTokenRef.current(idToken);
    };

    document.addEventListener('AppleIDSignInOnSuccess', handleSuccess);

    loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js').then(() => {
      if (cancelled || !window.AppleID) return;
      window.AppleID.auth.init({
        clientId: CLIENT_ID,
        scope: 'name email',
        redirectURI: REDIRECT_URI,
        usePopup: true,
      });
    });

    return () => {
      cancelled = true;
      document.removeEventListener('AppleIDSignInOnSuccess', handleSuccess);
    };
  }, []);

  if (!CLIENT_ID || !REDIRECT_URI) return null;

  return (
    <div
      id="appleid-signin"
      data-color="black"
      data-border="true"
      data-type="sign-in"
      data-width="320"
      data-height="40"
      className="mx-auto cursor-pointer"
    />
  );
}
