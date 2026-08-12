import { useEffect, useRef } from 'react';

/**
 * Makes an overlay's open state participate in browser history: opening it
 * pushes a same-URL history entry (no visible URL change), so the hardware
 * back button closes the overlay first instead of leaving the page. Closing
 * it any other way (X button, backdrop, Escape, swipe) should call the
 * returned `requestClose` instead of the raw state setter, so that close
 * pops the same entry rather than leaving a dangling forward-entry behind.
 */
export function useHistoryBackedDialog(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  // Read fresh on every popstate/requestClose without re-subscribing the
  // listener every render — onClose is typically a new inline closure each
  // time the caller re-renders.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open && !pushedRef.current) {
      window.history.pushState({ ...(window.history.state as object | null), overlay: true }, '');
      pushedRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    function handlePopState() {
      if (pushedRef.current) {
        pushedRef.current = false;
        onCloseRef.current();
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function requestClose() {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }

  return requestClose;
}
