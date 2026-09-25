import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { customerChatKeys } from '~/api/customerChats';
import { customerCommentKeys } from '~/api/customerComments';
import { useSignalR } from '~/hooks/useSignalR';
import { useCustomerHub } from '~/store/useCustomerHub';

/**
 * The мизоҷ's realtime connection, owned by the (account) layout so the sidebar's unread badge
 * stays live on every page. The server only ever says "this chat changed" (ChatUpdated) or "this
 * post's comments changed" (CommentsUpdated), with ids only; the data itself is re-read from /api/public, so nothing arrives that the tenant filter
 * has not passed. After a reconnect everything is re-read, in case events were missed.
 */
export function useCustomerRealtime() {
  const queryClient = useQueryClient();
  const start = useCustomerHub((s) => s.start);
  const stop = useCustomerHub((s) => s.stop);
  const connection = useCustomerHub((s) => s.connection);
  const reconnectCount = useCustomerHub((s) => s.reconnectCount);

  useEffect(() => {
    // Deferred one tick, as in useRealtimeConnection: StrictMode's synthetic unmount must be
    // able to cancel the first start before negotiation begins.
    const timer = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(timer);
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reconnectCount === 0) return;
    void queryClient.invalidateQueries({ queryKey: customerChatKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all });
  }, [queryClient, reconnectCount]);

  useSignalR(connection, {
    ChatUpdated: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.all }),
    CommentsUpdated: () => void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all }),
  });
}
