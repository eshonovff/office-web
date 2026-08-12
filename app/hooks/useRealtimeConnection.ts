import { useEffect } from 'react';
import { useInboxHub } from '~/store/useInboxHub';

/**
 * Owns the single shared /hubs/inbox connection for the whole authenticated
 * shell. Started once here (in the app layout) rather than per-page, so
 * pages other than /inbox — where the personal notification bell lives —
 * still receive realtime events (e.g. NotificationReceived) without opening
 * a second connection. useInboxRealtime and useNotificationsRealtime only
 * subscribe to events on this connection; they no longer start/stop it.
 */
export function useRealtimeConnection() {
  const start = useInboxHub((s) => s.start);
  const stop = useInboxHub((s) => s.stop);

  useEffect(() => {
    // React StrictMode mounts, cleans up, and mounts effects again in development.
    // Deferring one tick lets that synthetic cleanup cancel the first start before
    // SignalR begins negotiation and logs a misleading connection failure.
    const startTimer = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(startTimer);
      void stop();
    };
    // Mount/unmount only — start/stop are idempotent, and re-running this on
    // every render (start/stop are stable store actions but re-created per
    // createHubStore call) would just churn the same connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
