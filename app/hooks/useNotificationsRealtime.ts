import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSignalR } from '~/hooks/useSignalR';
import { useInboxHub } from '~/store/useInboxHub';
import type { NotificationDto } from '~/types/notification';

/**
 * Subscribes to NotificationReceived on the shared /hubs/inbox connection
 * (owned by useRealtimeConnection in the app layout — this hook only
 * listens) and keeps the ['notifications'] query live: prepends realtime
 * arrivals, and refetches after a reconnect so anything pushed while the
 * socket was down isn't lost.
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const { connection, reconnectCount } = useInboxHub();

  useEffect(() => {
    if (reconnectCount === 0) return;
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient, reconnectCount]);

  useSignalR(connection, {
    NotificationReceived: (notification: unknown) => {
      const incoming = notification as NotificationDto;
      queryClient.setQueryData<NotificationDto[]>(['notifications'], (old) => {
        if (!old) return [incoming];
        if (old.some((n) => n.id === incoming.id)) return old;
        return [incoming, ...old];
      });
    },
  });
}
