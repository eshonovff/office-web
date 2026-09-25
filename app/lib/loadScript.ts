const loadedScripts = new Map<string, Promise<void>>();

// Shared so GoogleSignInButton/AppleSignInButton mounting twice (e.g. StrictMode, or both
// buttons on one page loading concurrently) never injects the same <script> tag twice.
export function loadScript(src: string): Promise<void> {
  let promise = loadedScripts.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
    loadedScripts.set(src, promise);
  }
  return promise;
}
